from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..auth.schemas import UserResponse
from ..auth.dependencies import get_current_active_user
from ..models.models import User

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user profile"""
    return current_user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/", response_model=List[UserResponse])
async def search_users(
    q: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search users by name, email, or username"""
    query = db.query(User)
    
    if q:
        search_filter = (
            User.full_name.ilike(f"%{q}%") |
            User.email.ilike(f"%{q}%") |
            User.username.ilike(f"%{q}%")
        )
        query = query.filter(search_filter)
    
    users = query.limit(20).all()
    return users

