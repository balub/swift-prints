"""
Authentication middleware and dependencies for FastAPI.
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User, UserRole
from app.services.auth_service import auth_service

# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer credentials
        db: Database session

    Returns:
        User: Current authenticated user

    Raises:
        HTTPException: If authentication fails
    """
    try:
        # Verify token
        token_payload = auth_service.verify_supabase_token(
            credentials.credentials)

        # Get or create user
        user = auth_service.get_or_create_user(token_payload)

        return user

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user (additional checks can be added here).

    Args:
        current_user: Current authenticated user

    Returns:
        User: Current active user
    """
    # Add any additional user status checks here
    return current_user


def require_role(required_role: UserRole):
    """
    Dependency factory for role-based access control.

    Args:
        required_role: Required user role

    Returns:
        Dependency function
    """
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if not auth_service.check_permissions(current_user, required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role.value}"
            )
        return current_user

    return role_checker


# Common role dependencies
require_customer = require_role(UserRole.CUSTOMER)
require_maker = require_role(UserRole.MAKER)
require_admin = require_role(UserRole.ADMIN)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get current user if authenticated, None otherwise.
    Useful for endpoints that work with or without authentication.

    Args:
        credentials: Optional HTTP Bearer credentials
        db: Database session

    Returns:
        Optional[User]: Current user if authenticated, None otherwise
    """
    if not credentials:
        return None

    try:
        token_payload = auth_service.verify_supabase_token(
            credentials.credentials)
        user = auth_service.get_or_create_user(token_payload)
        return user
    except:
        return None
