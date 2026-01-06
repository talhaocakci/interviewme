from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    username: Optional[str] = None


class UserLogin(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    password: str


class PhoneOTPRequest(BaseModel):
    phone_number: str


class PhoneOTPVerify(BaseModel):
    phone_number: str
    otp_code: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: Optional[str]
    email: Optional[str]
    phone_number: Optional[str]
    full_name: Optional[str]
    avatar_url: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_seen: Optional[datetime]

    class Config:
        from_attributes = True


class OAuthCallbackRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None

