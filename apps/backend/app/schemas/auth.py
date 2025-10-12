"""
Authentication-related Pydantic schemas.
"""
from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

from app.models import UserRole


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    role: UserRole


class UserCreate(UserBase):
    """Schema for creating a user."""
    pass


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None


class UserInDB(UserBase):
    """Schema for user in database."""
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class User(UserInDB):
    """Public user schema."""
    pass


class Token(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data."""
    sub: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    """Registration request schema."""
    email: EmailStr
    password: str
    role: UserRole = UserRole.CUSTOMER
