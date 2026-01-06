from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth.schemas import (
    UserCreate, UserLogin, TokenResponse, UserResponse,
    PhoneOTPRequest, PhoneOTPVerify, OAuthCallbackRequest
)
from ..auth.service import auth_service
from ..auth.dependencies import get_current_active_user
from ..models.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user with email/password"""
    # Check if user already exists
    if user_data.email:
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    if user_data.phone_number:
        existing_user = db.query(User).filter(User.phone_number == user_data.phone_number).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered"
            )
    
    # Create user
    if not user_data.email and not user_data.phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or phone number required"
        )
    
    user = auth_service.create_user_with_email(
        db=db,
        email=user_data.email or "",
        password=user_data.password,
        full_name=user_data.full_name
    )
    
    # Create tokens
    access_token = auth_service.create_access_token(data={"sub": str(user.id)})
    refresh_token = auth_service.create_refresh_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login with email/phone and password"""
    user = auth_service.authenticate_user(
        db=db,
        email=user_data.email,
        phone_number=user_data.phone_number,
        password=user_data.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create tokens
    access_token = auth_service.create_access_token(data={"sub": str(user.id)})
    refresh_token = auth_service.create_refresh_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/phone/send-otp")
async def send_otp(phone_data: PhoneOTPRequest):
    """Send OTP to phone number"""
    success = auth_service.send_phone_otp(phone_data.phone_number)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP"
        )
    
    return {"message": "OTP sent successfully"}


@router.post("/phone/verify-otp", response_model=TokenResponse)
async def verify_otp(phone_data: PhoneOTPVerify, db: Session = Depends(get_db)):
    """Verify OTP and login/register user"""
    user = auth_service.verify_phone_otp(
        db=db,
        phone_number=phone_data.phone_number,
        otp_code=phone_data.otp_code
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP"
        )
    
    # Create tokens
    access_token = auth_service.create_access_token(data={"sub": str(user.id)})
    refresh_token = auth_service.create_refresh_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/google", response_model=TokenResponse)
async def google_auth(request: OAuthCallbackRequest, db: Session = Depends(get_db)):
    """Authenticate with Google"""
    google_user_info = await auth_service.verify_google_token(request.code)
    
    if not google_user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )
    
    user = await auth_service.authenticate_google(db=db, google_user_info=google_user_info)
    
    # Create tokens
    access_token = auth_service.create_access_token(data={"sub": str(user.id)})
    refresh_token = auth_service.create_refresh_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/facebook", response_model=TokenResponse)
async def facebook_auth(request: OAuthCallbackRequest, db: Session = Depends(get_db)):
    """Authenticate with Facebook"""
    user = await auth_service.authenticate_facebook(db=db, access_token=request.code)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Facebook token"
        )
    
    # Create tokens
    access_token = auth_service.create_access_token(data={"sub": str(user.id)})
    refresh_token = auth_service.create_refresh_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/apple", response_model=TokenResponse)
async def apple_auth(request: OAuthCallbackRequest, db: Session = Depends(get_db)):
    """Authenticate with Apple"""
    user = await auth_service.authenticate_apple(db=db, id_token_str=request.code)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Apple token"
        )
    
    # Create tokens
    access_token = auth_service.create_access_token(data={"sub": str(user.id)})
    refresh_token = auth_service.create_refresh_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user

