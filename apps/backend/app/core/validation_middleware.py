"""
Input validation and sanitization middleware.
"""
import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import bleach
import re

from .security_utils import SecurityValidator, InputValidator

logger = logging.getLogger(__name__)


class InputValidationMiddleware(BaseHTTPMiddleware):
    """Middleware for validating and sanitizing all input data."""

    def __init__(self, app):
        super().__init__(app)
        self.security_validator = SecurityValidator()
        self.input_validator = InputValidator()

        # Define validation rules for different endpoints
        self.validation_rules = {
            # File upload endpoints
            "/api/upload/initiate": {
                "max_body_size": 1024,  # 1KB for metadata
                "required_fields": ["filename", "size"],
                "sanitize_strings": True
            },
            "/api/upload/complete": {
                "max_body_size": 1024,
                "required_fields": ["session_id"],
                "sanitize_strings": True
            },

            # Analysis endpoints
            "/api/analyze": {
                "max_body_size": 2048,
                "sanitize_strings": True
            },

            # Order endpoints
            "/api/orders": {
                "max_body_size": 10240,  # 10KB
                "sanitize_strings": True,
                "validate_json": True
            },

            # Maker endpoints
            "/api/makers": {
                "max_body_size": 5120,  # 5KB
                "sanitize_strings": True,
                "validate_coordinates": True
            },

            # Default rules
            "default": {
                "max_body_size": 1048576,  # 1MB default
                "sanitize_strings": True
            }
        }

    async def dispatch(self, request: Request, call_next) -> Response:
        """Validate and sanitize request data."""

        # Skip validation for certain paths
        if self._should_skip_validation(request.url.path):
            return await call_next(request)

        # Get validation rules for this endpoint
        rules = self._get_validation_rules(request.url.path, request.method)

        try:
            # Validate request size
            await self._validate_request_size(request, rules)

            # Validate and sanitize request body if present
            if request.method in ["POST", "PUT", "PATCH"]:
                await self._validate_request_body(request, rules)

            # Validate query parameters
            await self._validate_query_params(request, rules)

            # Validate headers
            await self._validate_headers(request)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Input validation error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request validation failed"
            )

        return await call_next(request)

    def _should_skip_validation(self, path: str) -> bool:
        """Check if path should skip validation."""
        skip_paths = [
            "/health",
            "/ping",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/favicon.ico",
            "/static/"
        ]
        return any(path.startswith(skip_path) for skip_path in skip_paths)

    def _get_validation_rules(self, path: str, method: str) -> Dict[str, Any]:
        """Get validation rules for endpoint."""
        # Check for exact path match
        if path in self.validation_rules:
            return self.validation_rules[path]

        # Check for pattern matches
        for pattern, rules in self.validation_rules.items():
            if pattern != "default" and path.startswith(pattern):
                return rules

        # Return default rules
        return self.validation_rules["default"]

    async def _validate_request_size(self, request: Request, rules: Dict[str, Any]):
        """Validate request body size."""
        max_size = rules.get("max_body_size", 1048576)  # 1MB default

        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Request body too large. Maximum size: {max_size} bytes"
            )

    async def _validate_request_body(self, request: Request, rules: Dict[str, Any]):
        """Validate and sanitize request body."""
        try:
            # Read body
            body = await request.body()
            if not body:
                return

            # Parse JSON if content type is JSON
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                try:
                    data = json.loads(body)

                    # Validate required fields
                    if "required_fields" in rules:
                        missing_fields = self.input_validator.validate_json_structure(
                            data, rules["required_fields"]
                        )
                        if missing_fields:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Missing required fields: {', '.join(missing_fields)}"
                            )

                    # Sanitize strings if enabled
                    if rules.get("sanitize_strings", False):
                        data = self._sanitize_json_data(data)

                    # Validate coordinates if enabled
                    if rules.get("validate_coordinates", False):
                        self._validate_coordinates_in_data(data)

                    # Store sanitized data back to request
                    sanitized_body = json.dumps(data).encode()
                    request._body = sanitized_body

                except json.JSONDecodeError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid JSON format"
                    )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Request body validation error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request body validation failed"
            )

    async def _validate_query_params(self, request: Request, rules: Dict[str, Any]):
        """Validate and sanitize query parameters."""
        try:
            sanitized_params = {}

            for key, value in request.query_params.items():
                # Sanitize parameter name
                clean_key = self._sanitize_string(key, max_length=100)

                # Sanitize parameter value
                if isinstance(value, str):
                    clean_value = self._sanitize_string(value, max_length=1000)
                else:
                    clean_value = value

                sanitized_params[clean_key] = clean_value

            # Update request query params (this is a bit hacky but necessary)
            request._query_params = sanitized_params

        except Exception as e:
            logger.error(f"Query parameter validation error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query parameter validation failed"
            )

    async def _validate_headers(self, request: Request):
        """Validate request headers."""
        try:
            # Check for suspicious headers
            suspicious_headers = [
                "x-forwarded-host",
                "x-original-url",
                "x-rewrite-url"
            ]

            for header in suspicious_headers:
                if header in request.headers:
                    logger.warning(f"Suspicious header detected: {header}")

            # Validate User-Agent
            user_agent = request.headers.get("user-agent", "")
            if len(user_agent) > 500:  # Unusually long user agent
                logger.warning(
                    f"Unusually long User-Agent: {len(user_agent)} characters")

            # Validate Content-Type for POST/PUT requests
            if request.method in ["POST", "PUT", "PATCH"]:
                content_type = request.headers.get("content-type", "")
                if not content_type:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Content-Type header is required"
                    )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Header validation error: {e}")

    def _sanitize_json_data(self, data: Any) -> Any:
        """Recursively sanitize JSON data."""
        if isinstance(data, dict):
            return {
                self._sanitize_string(k, max_length=100): self._sanitize_json_data(v)
                for k, v in data.items()
            }
        elif isinstance(data, list):
            return [self._sanitize_json_data(item) for item in data]
        elif isinstance(data, str):
            return self._sanitize_string(data)
        else:
            return data

    def _sanitize_string(self, text: str, max_length: int = 1000) -> str:
        """Sanitize string input."""
        if not isinstance(text, str):
            return text

        # Truncate if too long
        if len(text) > max_length:
            text = text[:max_length]

        # Remove HTML tags and dangerous content
        cleaned = bleach.clean(
            text,
            tags=[],  # No HTML tags allowed
            attributes={},
            strip=True
        )

        # Remove control characters except newlines and tabs
        cleaned = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', cleaned)

        return cleaned.strip()

    def _validate_coordinates_in_data(self, data: Dict[str, Any]):
        """Validate coordinates in data."""
        # Check for latitude/longitude fields
        lat_fields = ["lat", "latitude", "location_lat"]
        lng_fields = ["lng", "longitude", "location_lng"]

        lat_value = None
        lng_value = None

        # Find latitude value
        for field in lat_fields:
            if field in data and data[field] is not None:
                try:
                    lat_value = float(data[field])
                    break
                except (ValueError, TypeError):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid latitude value: {data[field]}"
                    )

        # Find longitude value
        for field in lng_fields:
            if field in data and data[field] is not None:
                try:
                    lng_value = float(data[field])
                    break
                except (ValueError, TypeError):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid longitude value: {data[field]}"
                    )

        # Validate coordinates if both are present
        if lat_value is not None and lng_value is not None:
            if not self.input_validator.validate_coordinates(lat_value, lng_value):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid coordinates"
                )


class RequestSizeMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce global request size limits."""

    def __init__(self, app, max_request_size: int = 100 * 1024 * 1024):  # 100MB default
        super().__init__(app)
        self.max_request_size = max_request_size

    async def dispatch(self, request: Request, call_next) -> Response:
        """Enforce request size limits."""

        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
                if size > self.max_request_size:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Request too large. Maximum size: {self.max_request_size} bytes"
                    )
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Content-Length header"
                )

        return await call_next(request)
