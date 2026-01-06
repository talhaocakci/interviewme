from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
# Twilio removed - using email/social auth only
from google.oauth2 import id_token
from google.auth.transport import requests
import httpx
import secrets

from ..models.models import User, AuthProvider, AuthProviderType
from ..config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    def __init__(self):
        self.pwd_context = pwd_context
        self.otp_storage: Dict[str, Dict[str, Any]] = {}  # In production, use Redis
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        return self.pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt
    
    def create_refresh_token(self, data: dict) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[dict]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            return payload
        except JWTError:
            return None
    
    def create_user_with_email(self, db: Session, email: str, password: str, full_name: Optional[str] = None) -> User:
        """Create a new user with email/password"""
        hashed_password = self.get_password_hash(password)
        user = User(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            is_verified=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create auth provider entry
        auth_provider = AuthProvider(
            user_id=user.id,
            provider=AuthProviderType.EMAIL,
            provider_user_id=email
        )
        db.add(auth_provider)
        db.commit()
        
        return user
    
    def authenticate_user(self, db: Session, email: Optional[str] = None, 
                         phone_number: Optional[str] = None, password: str = "") -> Optional[User]:
        """Authenticate user with email/phone and password"""
        if email:
            user = db.query(User).filter(User.email == email).first()
        elif phone_number:
            user = db.query(User).filter(User.phone_number == phone_number).first()
        else:
            return None
        
        if not user or not user.hashed_password:
            return None
        
        if not self.verify_password(password, user.hashed_password):
            return None
        
        return user
    
    def send_phone_otp(self, phone_number: str) -> bool:
        """Send OTP via console (Development mode - no SMS service)"""
        # Generate OTP and store in memory
        otp = str(secrets.randbelow(1000000)).zfill(6)
        self.otp_storage[phone_number] = {
            "otp": otp,
            "expires_at": datetime.utcnow() + timedelta(minutes=5)
        }
        # Print OTP to console for development
        logger.info(f"=== OTP for {phone_number}: {otp} ===")
        print(f"\n{'='*50}\nOTP for {phone_number}: {otp}\n{'='*50}\n")
        return True
    
    def verify_phone_otp(self, db: Session, phone_number: str, otp_code: str) -> Optional[User]:
        """Verify OTP and create/return user"""
        stored_otp = self.otp_storage.get(phone_number)
        
        if not stored_otp:
            return None
        
        if stored_otp["expires_at"] < datetime.utcnow():
            del self.otp_storage[phone_number]
            return None
        
        if stored_otp["otp"] != otp_code:
            return None
        
        # OTP verified, remove it
        del self.otp_storage[phone_number]
        
        # Find or create user
        user = db.query(User).filter(User.phone_number == phone_number).first()
        if not user:
            user = User(
                phone_number=phone_number,
                is_verified=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Create auth provider entry
            auth_provider = AuthProvider(
                user_id=user.id,
                provider=AuthProviderType.PHONE,
                provider_user_id=phone_number
            )
            db.add(auth_provider)
            db.commit()
        
        return user
    
    async def verify_google_token(self, token: str) -> Optional[dict]:
        """Verify Google OAuth token"""
        try:
            idinfo = id_token.verify_oauth2_token(
                token, requests.Request(), settings.GOOGLE_CLIENT_ID
            )
            return idinfo
        except Exception as e:
            print(f"Error verifying Google token: {e}")
            return None
    
    async def authenticate_google(self, db: Session, google_user_info: dict) -> User:
        """Authenticate or create user from Google"""
        google_id = google_user_info.get("sub")
        email = google_user_info.get("email")
        
        # Check if user exists with this Google ID
        auth_provider = db.query(AuthProvider).filter(
            AuthProvider.provider == AuthProviderType.GOOGLE,
            AuthProvider.provider_user_id == google_id
        ).first()
        
        if auth_provider:
            return auth_provider.user
        
        # Check if user exists with this email
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            user = User(
                email=email,
                full_name=google_user_info.get("name"),
                avatar_url=google_user_info.get("picture"),
                is_verified=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Create auth provider link
        auth_provider = AuthProvider(
            user_id=user.id,
            provider=AuthProviderType.GOOGLE,
            provider_user_id=google_id
        )
        db.add(auth_provider)
        db.commit()
        
        return user
    
    async def authenticate_facebook(self, db: Session, access_token: str) -> Optional[User]:
        """Authenticate or create user from Facebook"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://graph.facebook.com/me?fields=id,name,email,picture&access_token={access_token}"
                )
                fb_user_info = response.json()
            
            if "error" in fb_user_info:
                return None
            
            facebook_id = fb_user_info.get("id")
            email = fb_user_info.get("email")
            
            # Check if user exists with this Facebook ID
            auth_provider = db.query(AuthProvider).filter(
                AuthProvider.provider == AuthProviderType.FACEBOOK,
                AuthProvider.provider_user_id == facebook_id
            ).first()
            
            if auth_provider:
                return auth_provider.user
            
            # Check if user exists with this email
            user = None
            if email:
                user = db.query(User).filter(User.email == email).first()
            
            if not user:
                user = User(
                    email=email,
                    full_name=fb_user_info.get("name"),
                    avatar_url=fb_user_info.get("picture", {}).get("data", {}).get("url"),
                    is_verified=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            
            # Create auth provider link
            auth_provider = AuthProvider(
                user_id=user.id,
                provider=AuthProviderType.FACEBOOK,
                provider_user_id=facebook_id,
                access_token=access_token
            )
            db.add(auth_provider)
            db.commit()
            
            return user
        except Exception as e:
            print(f"Error authenticating Facebook user: {e}")
            return None
    
    async def authenticate_apple(self, db: Session, id_token_str: str) -> Optional[User]:
        """Authenticate or create user from Apple Sign In"""
        # Apple Sign In verification requires more setup
        # This is a simplified version
        try:
            # In production, verify the id_token with Apple's public keys
            payload = jwt.decode(id_token_str, options={"verify_signature": False})
            
            apple_id = payload.get("sub")
            email = payload.get("email")
            
            # Check if user exists with this Apple ID
            auth_provider = db.query(AuthProvider).filter(
                AuthProvider.provider == AuthProviderType.APPLE,
                AuthProvider.provider_user_id == apple_id
            ).first()
            
            if auth_provider:
                return auth_provider.user
            
            # Check if user exists with this email
            user = None
            if email:
                user = db.query(User).filter(User.email == email).first()
            
            if not user:
                user = User(
                    email=email,
                    is_verified=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            
            # Create auth provider link
            auth_provider = AuthProvider(
                user_id=user.id,
                provider=AuthProviderType.APPLE,
                provider_user_id=apple_id
            )
            db.add(auth_provider)
            db.commit()
            
            return user
        except Exception as e:
            print(f"Error authenticating Apple user: {e}")
            return None


auth_service = AuthService()

