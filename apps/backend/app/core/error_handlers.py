"""
Comprehensive error handling middleware and exception handlers.
"""
from typing import Dict, Any, Optional
import logging
import traceback
import uuid
from datetime import datetime
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from pydantic import ValidationError
import redis

logger = logging.getLogger(__name__)


class ErrorResponse:
    """Standardized error response format."""

    def __init__(
        self,
        error_code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        timestamp: Optional[str] = None
    ):
        self.error_code = error_code
        self.message = message
        self.details = details or {}
        self.request_id = request_id or str(uuid.uuid4())
        self.timestamp = timestamp or datetime.now().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response."""
        return {
            "error": {
                "code": self.error_code,
                "message": self.message,
                "details": self.details,
                "request_id": self.request_id,
                "timestamp": self.timestamp
            }
        }


class ErrorLogger:
    """Error logging utility."""

    @staticmethod
    def log_error(
        error: Exception,
        request: Request,
        error_code: str,
        additional_context: Optional[Dict] = None
    ) -> str:
        """Log error with context and return request ID."""
        request_id = str(uuid.uuid4())

        context = {
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "headers": dict(request.headers),
            "error_type": type(error).__name__,
            "error_message": str(error),
            "error_code": error_code,
            **(additional_context or {})
        }

        # Log the error
        logger.error(
            f"API Error [{error_code}]: {str(error)}",
            extra=context,
            exc_info=True
        )

        # Store error details in Redis for debugging (optional)
        try:
            from ..core.config import settings
            redis_client = redis.Redis.from_url(settings.redis_url)
            error_key = f"error:{request_id}"
            error_data = {
                **context,
                "traceback": traceback.format_exc()
            }
            redis_client.setex(error_key, 3600, str(
                error_data))  # Store for 1 hour
        except Exception:
            pass  # Don't fail if Redis is unavailable

        return request_id


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors."""
    request_id = ErrorLogger.log_error(
        exc, request, "VALIDATION_ERROR",
        {"validation_errors": exc.errors()}
    )

    # Format validation errors for user-friendly response
    formatted_errors = []
    for error in exc.errors():
        field_path = " -> ".join(str(loc) for loc in error["loc"])
        formatted_errors.append({
            "field": field_path,
            "message": error["msg"],
            "type": error["type"]
        })

    error_response = ErrorResponse(
        error_code="VALIDATION_ERROR",
        message="Request validation failed",
        details={
            "validation_errors": formatted_errors,
            "invalid_fields": len(formatted_errors)
        },
        request_id=request_id
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response.to_dict()
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    request_id = ErrorLogger.log_error(
        exc, request, f"HTTP_{exc.status_code}",
        {"status_code": exc.status_code}
    )

    # Map status codes to user-friendly messages
    status_messages = {
        400: "Bad request - please check your input",
        401: "Authentication required",
        403: "Access forbidden - insufficient permissions",
        404: "Resource not found",
        409: "Conflict - resource already exists or is in use",
        422: "Invalid input data",
        429: "Too many requests - please try again later",
        500: "Internal server error - please try again later"
    }

    error_response = ErrorResponse(
        error_code=f"HTTP_{exc.status_code}",
        message=exc.detail or status_messages.get(
            exc.status_code, "An error occurred"),
        details={"status_code": exc.status_code},
        request_id=request_id
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.to_dict()
    )


async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors."""
    request_id = ErrorLogger.log_error(
        exc, request, "DATABASE_ERROR",
        {"database_error_type": type(exc).__name__}
    )

    # Handle specific database errors
    if isinstance(exc, IntegrityError):
        error_message = "Data integrity constraint violation"
        if "UNIQUE constraint failed" in str(exc):
            error_message = "Resource already exists"
        elif "FOREIGN KEY constraint failed" in str(exc):
            error_message = "Referenced resource not found"
    else:
        error_message = "Database operation failed"

    error_response = ErrorResponse(
        error_code="DATABASE_ERROR",
        message=error_message,
        details={"error_type": type(exc).__name__},
        request_id=request_id
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.to_dict()
    )


async def redis_exception_handler(request: Request, exc: redis.RedisError):
    """Handle Redis errors."""
    request_id = ErrorLogger.log_error(
        exc, request, "CACHE_ERROR",
        {"redis_error_type": type(exc).__name__}
    )

    error_response = ErrorResponse(
        error_code="CACHE_ERROR",
        message="Cache service temporarily unavailable",
        details={"error_type": type(exc).__name__},
        request_id=request_id
    )

    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content=error_response.to_dict()
    )


async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions."""
    request_id = ErrorLogger.log_error(
        exc, request, "INTERNAL_ERROR",
        {"exception_type": type(exc).__name__}
    )

    error_response = ErrorResponse(
        error_code="INTERNAL_ERROR",
        message="An unexpected error occurred",
        details={"error_type": type(exc).__name__},
        request_id=request_id
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.to_dict()
    )


# Custom exceptions for business logic
class SwiftPrintsException(Exception):
    """Base exception for Swift Prints application."""

    def __init__(self, message: str, error_code: str = "BUSINESS_ERROR", details: Optional[Dict] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class FileProcessingError(SwiftPrintsException):
    """Exception for file processing errors."""

    def __init__(self, message: str, file_id: Optional[str] = None):
        super().__init__(
            message=message,
            error_code="FILE_PROCESSING_ERROR",
            details={"file_id": file_id} if file_id else {}
        )


class AnalysisError(SwiftPrintsException):
    """Exception for STL analysis errors."""

    def __init__(self, message: str, analysis_id: Optional[str] = None):
        super().__init__(
            message=message,
            error_code="ANALYSIS_ERROR",
            details={"analysis_id": analysis_id} if analysis_id else {}
        )


class PricingError(SwiftPrintsException):
    """Exception for pricing calculation errors."""

    def __init__(self, message: str, pricing_context: Optional[Dict] = None):
        super().__init__(
            message=message,
            error_code="PRICING_ERROR",
            details=pricing_context or {}
        )


class OrderError(SwiftPrintsException):
    """Exception for order processing errors."""

    def __init__(self, message: str, order_id: Optional[str] = None):
        super().__init__(
            message=message,
            error_code="ORDER_ERROR",
            details={"order_id": order_id} if order_id else {}
        )


class MakerError(SwiftPrintsException):
    """Exception for maker-related errors."""

    def __init__(self, message: str, maker_id: Optional[str] = None):
        super().__init__(
            message=message,
            error_code="MAKER_ERROR",
            details={"maker_id": maker_id} if maker_id else {}
        )


async def swift_prints_exception_handler(request: Request, exc: SwiftPrintsException):
    """Handle custom Swift Prints exceptions."""
    request_id = ErrorLogger.log_error(
        exc, request, exc.error_code,
        {"business_error_details": exc.details}
    )

    error_response = ErrorResponse(
        error_code=exc.error_code,
        message=exc.message,
        details=exc.details,
        request_id=request_id
    )

    # Map error codes to HTTP status codes
    status_code_map = {
        "FILE_PROCESSING_ERROR": status.HTTP_422_UNPROCESSABLE_ENTITY,
        "ANALYSIS_ERROR": status.HTTP_422_UNPROCESSABLE_ENTITY,
        "PRICING_ERROR": status.HTTP_400_BAD_REQUEST,
        "ORDER_ERROR": status.HTTP_400_BAD_REQUEST,
        "MAKER_ERROR": status.HTTP_400_BAD_REQUEST,
        "BUSINESS_ERROR": status.HTTP_400_BAD_REQUEST
    }

    http_status = status_code_map.get(
        exc.error_code, status.HTTP_500_INTERNAL_SERVER_ERROR)

    return JSONResponse(
        status_code=http_status,
        content=error_response.to_dict()
    )


# Rate limiting exception
class RateLimitExceeded(SwiftPrintsException):
    """Exception for rate limit exceeded."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[int] = None):
        super().__init__(
            message=message,
            error_code="RATE_LIMIT_EXCEEDED",
            details={"retry_after": retry_after} if retry_after else {}
        )


async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded):
    """Handle rate limit exceptions."""
    request_id = ErrorLogger.log_error(exc, request, "RATE_LIMIT_EXCEEDED")

    error_response = ErrorResponse(
        error_code="RATE_LIMIT_EXCEEDED",
        message=exc.message,
        details=exc.details,
        request_id=request_id
    )

    headers = {}
    if exc.details.get("retry_after"):
        headers["Retry-After"] = str(exc.details["retry_after"])

    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content=error_response.to_dict(),
        headers=headers
    )


# Error handler registration function
def register_error_handlers(app):
    """Register all error handlers with the FastAPI app."""
    app.add_exception_handler(RequestValidationError,
                              validation_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(SQLAlchemyError, database_exception_handler)
    app.add_exception_handler(redis.RedisError, redis_exception_handler)
    app.add_exception_handler(SwiftPrintsException,
                              swift_prints_exception_handler)
    app.add_exception_handler(RateLimitExceeded, rate_limit_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)
