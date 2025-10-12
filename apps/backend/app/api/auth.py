"""
Authentication API endpoints.
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.auth_middleware import get_current_user, get_current_active_user
from app.models import User
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["authentication"])


class TokenVerifyRequest(BaseModel):
    """Request model for token verification."""
    token: str


class TokenVerifyResponse(BaseModel):
    """Response model for token verification."""
    valid: bool
    user_id: str
    email: str
    role: str


class UserProfileResponse(BaseModel):
    """Response model for user profile."""
    id: str
    email: str
    role: str
    created_at: str
    updated_at: str


@router.post("/verify", response_model=TokenVerifyResponse)
async def verify_token(request: TokenVerifyRequest):
    """
    Verify JWT token and return user information.

    Args:
        request: Token verification request

    Returns:
        TokenVerifyResponse: Token verification result
    """
    try:
        # Verify token
        token_payload = auth_service.verify_supabase_token(request.token)

        # Get or create user
        user = auth_service.get_or_create_user(token_payload)

        return TokenVerifyResponse(
            valid=True,
            user_id=str(user.id),
            email=user.email,
            role=user.role.value
        )

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}"
        )


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current user profile.

    Args:
        current_user: Current authenticated user

    Returns:
        UserProfileResponse: User profile information
    """
    return UserProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        role=current_user.role.value,
        created_at=current_user.created_at.isoformat(),
        updated_at=current_user.updated_at.isoformat()
    )


@router.post("/refresh")
async def refresh_token(
    current_user: User = Depends(get_current_user)
):
    """
    Refresh authentication token.

    Args:
        current_user: Current authenticated user

    Returns:
        Dict: New token information
    """
    # For Supabase, token refresh is handled client-side
    # This endpoint can be used for additional server-side logic
    return {
        "message": "Token refresh should be handled client-side with Supabase",
        "user_id": str(current_user.id)
    }


# Development/testing endpoints
@router.post("/dev/create-token")
async def create_development_token(user_data: Dict[str, Any]):
    """
    Create a development JWT token for testing.
    Only available in debug mode.

    Args:
        user_data: User data to encode in token

    Returns:
        Dict: Token information
    """
    from app.core.config import settings

    if not settings.debug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endpoint not available in production"
        )

    token = auth_service.create_local_token(user_data)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_data": user_data
    }
