import json
import os
import boto3
import re
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from typing import Optional

dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table(os.environ.get('USERS_TABLE', os.environ.get('DYNAMODB_TABLE', '')))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.environ['JWT_SECRET_KEY']
JWT_ALGORITHM = "HS256"


# Main handler - routes requests to correct function
def handler(event, context):
    """Main Lambda handler that routes to correct function"""
    print(f"Event: {json.dumps(event)}")
    
    # Get route key (e.g., "POST /auth/register")
    route_key = event.get('routeKey', '')
    http_method = event.get('requestContext', {}).get('http', {}).get('method', '')
    path = event.get('requestContext', {}).get('http', {}).get('path', '')
    
    print(f"Route: {route_key}, Method: {http_method}, Path: {path}")
    
    # Route to correct handler
    if 'register' in path or 'register' in route_key:
        return register(event, context)
    elif 'login' in path or 'login' in route_key:
        return login(event, context)
    elif 'refresh' in path or 'refresh' in route_key:
        return refresh_token(event, context)
    elif '/me' in path or '/me' in route_key:
        return get_current_user(event, context)
    else:
        return response(404, {'error': f'Route not found: {path}'})


def response(status_code: int, body: dict):
    """Create API Gateway response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
        },
        'body': json.dumps(body)
    }


def create_token(user_id: str, expires_minutes: int = 30) -> str:
    """Create JWT token"""
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    return jwt.encode(
        {'sub': user_id, 'exp': expire},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password"""
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """Hash password"""
    return pwd_context.hash(password)


def validate_email(email: str) -> bool:
    """Simple email validation"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def register(event, context):
    """Register new user"""
    try:
        body = json.loads(event.get('body', '{}'))
        email = body.get('email', '').strip().lower()
        password = body.get('password', '')
        full_name = body.get('full_name', '')
        
        if not email or not password:
            return response(400, {'error': 'Email and password required'})
        
        if not validate_email(email):
            return response(400, {'error': 'Invalid email format'})
        
        if len(password) < 6:
            return response(400, {'error': 'Password must be at least 6 characters'})
        
        # Check if user exists
        try:
            existing = users_table.get_item(Key={'PK': f'USER#{email}', 'SK': 'PROFILE'})
            if 'Item' in existing:
                return response(400, {'error': 'Email already registered'})
        except:
            pass
        
        # Create user
        user_id = email  # Simplified - in production use UUID
        hashed_pwd = hash_password(password)
        
        users_table.put_item(Item={
            'PK': f'USER#{email}',
            'SK': 'PROFILE',
            'userId': user_id,
            'email': email,
            'hashedPassword': hashed_pwd,
            'fullName': full_name or '',
            'createdAt': datetime.utcnow().isoformat(),
            'isActive': True
        })
        
        # Create tokens
        access_token = create_token(user_id, 30)
        refresh_token = create_token(user_id, 10080)  # 7 days
        
        return response(200, {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'bearer'
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return response(500, {'error': str(e)})


def login(event, context):
    """Login user"""
    try:
        body = json.loads(event['body'])
        email = body.get('email')
        password = body.get('password')
        
        if not email or not password:
            return response(400, {'error': 'Email and password required'})
        
        # Get user
        result = users_table.get_item(Key={'PK': f'USER#{email}', 'SK': 'PROFILE'})
        
        if 'Item' not in result:
            return response(401, {'error': 'Invalid credentials'})
        
        user = result['Item']
        
        # Verify password
        if not verify_password(password, user['hashedPassword']):
            return response(401, {'error': 'Invalid credentials'})
        
        # Create tokens
        access_token = create_token(user['userId'], 30)
        refresh_token = create_token(user['userId'], 10080)
        
        return response(200, {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'bearer'
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return response(500, {'error': str(e)})


def refresh_token(event, context):
    """Refresh access token"""
    try:
        body = json.loads(event.get('body', '{}'))
        refresh_token_str = body.get('refresh_token')
        
        if not refresh_token_str:
            return response(400, {'error': 'Refresh token required'})
        
        # Verify refresh token
        try:
            payload = jwt.decode(refresh_token_str, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get('sub')
        except Exception as e:
            print(f"Token decode error: {e}")
            return response(401, {'error': 'Invalid refresh token'})
        
        # Create new access token
        access_token = create_token(user_id, 30)
        
        return response(200, {
            'access_token': access_token,
            'token_type': 'bearer'
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return response(500, {'error': str(e)})


def get_current_user(event, context):
    """Get current user info"""
    try:
        # Extract token from Authorization header (check both formats)
        headers = event.get('headers', {})
        auth_header = headers.get('authorization') or headers.get('Authorization') or ''
        
        print(f"Headers: {headers}")
        print(f"Auth header: {auth_header}")
        
        if not auth_header:
            return response(401, {'error': 'No authorization header'})
        
        if not auth_header.startswith('Bearer '):
            return response(401, {'error': 'Invalid authorization format. Expected: Bearer <token>'})
        
        token = auth_header.replace('Bearer ', '').strip()
        print(f"Token extracted: {token[:20]}...")
        
        # Verify token
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get('sub')
            print(f"Token decoded successfully, user_id: {user_id}")
        except jwt.ExpiredSignatureError:
            return response(401, {'error': 'Token expired'})
        except jwt.JWTError as e:
            print(f"JWT decode error: {e}")
            return response(401, {'error': f'Invalid token: {str(e)}'})
        except Exception as e:
            print(f"Token decode error: {e}")
            return response(401, {'error': 'Invalid token'})
        
        # Get user
        result = users_table.get_item(Key={'PK': f'USER#{user_id}', 'SK': 'PROFILE'})
        
        if 'Item' not in result:
            return response(404, {'error': 'User not found'})
        
        user = result['Item']
        
        return response(200, {
            'id': user['userId'],
            'email': user['email'],
            'full_name': user.get('fullName', ''),
            'is_active': user.get('isActive', True),
            'created_at': user.get('createdAt', '')
        })
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return response(500, {'error': str(e)})

