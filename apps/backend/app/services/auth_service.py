"""
Authentication service using Supabase Auth.
"""
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from supabase import create_client, Client
import jwt
from datetime import datetime

from app.core.config import settings
from app.core.security import SecurityUtils
from app.models import User, UserRole
from app.core.database import SessionLocal


class AuthService:
    """Authentication service for Supabase integration."""

    def __init__(self):
        """Initialize Supabase client."""
        if settings.supabase_url and settings.supabase_key:
            self.supabase: Client = create_client(
                settings.supabase_url,
                settings.supabase_key
            )
        else:
            self.supabase = None

    def verify_supabase_token(self, token: str) -> Dict[str, Any]:
        """
        Verify Supabase JWT token.

        Args:
            token: JWT token from Supabase

        Returns:
            Dict with user information

        Raises:
            HTTPException: If token is invalid
        """
        if not self.supabase:
            # Fallback to local JWT verification for development
            return SecurityUtils.verify_token(token)

        try:
            # Verify token with Supabase
            response = self.supabase.auth.get_user(token)

            if response.user:
                return {
                    "sub": response.user.id,
                    "email": response.user.email,
                    "aud": "authenticated",
                    "exp": datetime.utcnow().timestamp() + 3600  # 1 hour from now
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token"
                )

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token verification failed: {str(e)}"
            )

    def get_or_create_user(self, token_payload: Dict[str, Any]) -> User:
        """
        Get or create user from token payload.

        Args:
            token_payload: Decoded JWT payload

        Returns:
            User: User instance
        """
        db = SessionLocal()
        try:
            user_id = token_payload.get("sub")
            email = token_payload.get("email")

            if not user_id or not email:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload"
                )

            # Try to find existing user
            user = db.query(User).filter(User.id == user_id).first()

            if not user:
                # Create new user
                user = User(
                    id=user_id,
                    email=email,
                    role=UserRole.CUSTOMER  # Default role
                )
                db.add(user)
                db.commit()
                db.refresh(user)

            return user

        finally:
            db.close()

    def check_permissions(self, user: User, required_role: UserRole) -> bool:
        """
        Check if user has required permissions.

        Args:
            user: User instance
            required_role: Required role for access

        Returns:
            bool: True if user has permission
        """
        role_hierarchy = {
            UserRole.CUSTOMER: 1,
            UserRole.MAKER: 2,
            UserRole.ADMIN: 3
        }

        user_level = role_hierarchy.get(user.role, 0)
        required_level = role_hierarchy.get(required_role, 0)

        return user_level >= required_level

    def create_local_token(self, user_data: Dict[str, Any]) -> str:
        """
        Create local JWT token for development/testing.

        Args:
            user_data: User data to encode

        Returns:
            str: JWT token
        """
        return SecurityUtils.create_access_token(user_data)


# Global auth service instance
auth_service = AuthService()
