"""
Security utilities and validation functions.
"""
import re
import hashlib
import secrets
import bleach
from typing import List, Optional, Dict, Any, Union
from pathlib import Path
import magic
from fastapi import HTTPException, status, UploadFile
import ipaddress
import html
import urllib.parse
from decimal import Decimal, InvalidOperation
import json

# Allowed file types and their MIME types
ALLOWED_FILE_TYPES = {
    'stl': ['application/octet-stream', 'model/stl', 'application/sla'],
    'obj': ['application/octet-stream', 'model/obj'],
    '3mf': ['application/vnd.ms-package.3dmanufacturing-3dmodel+xml']
}

# Maximum file sizes (in bytes)
MAX_FILE_SIZES = {
    'stl': 100 * 1024 * 1024,  # 100MB
    'obj': 50 * 1024 * 1024,   # 50MB
    '3mf': 25 * 1024 * 1024    # 25MB
}

# Dangerous file extensions
DANGEROUS_EXTENSIONS = {
    'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
    'php', 'asp', 'aspx', 'jsp', 'py', 'rb', 'pl', 'sh', 'ps1'
}


class SecurityValidator:
    """Security validation utilities."""

    @staticmethod
    def validate_file_upload(file: UploadFile) -> Dict[str, Any]:
        """
        Validate uploaded file for security and format compliance.

        Args:
            file: FastAPI UploadFile object

        Returns:
            Dict with validation results

        Raises:
            HTTPException: If file fails validation
        """
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filename is required"
            )

        # Check file extension
        file_ext = Path(file.filename).suffix.lower().lstrip('.')
        if file_ext not in ALLOWED_FILE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '{file_ext}' is not allowed. Allowed types: {list(ALLOWED_FILE_TYPES.keys())}"
            )

        # Check for dangerous extensions
        if file_ext in DANGEROUS_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File type is not allowed for security reasons"
            )

        # Check file size
        if file.size and file.size > MAX_FILE_SIZES.get(file_ext, 50 * 1024 * 1024):
            max_size_mb = MAX_FILE_SIZES.get(
                file_ext, 50 * 1024 * 1024) / (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum allowed size of {max_size_mb}MB"
            )

        # Validate filename for path traversal
        if not SecurityValidator.is_safe_filename(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid filename"
            )

        return {
            "filename": file.filename,
            "extension": file_ext,
            "size": file.size,
            "content_type": file.content_type,
            "is_valid": True
        }

    @staticmethod
    def validate_file_content(file_path: str, expected_type: str) -> bool:
        """
        Validate file content using python-magic.

        Args:
            file_path: Path to the file
            expected_type: Expected file type

        Returns:
            True if file content matches expected type
        """
        try:
            mime_type = magic.from_file(file_path, mime=True)
            return mime_type in ALLOWED_FILE_TYPES.get(expected_type, [])
        except Exception:
            return False

    @staticmethod
    def is_safe_filename(filename: str) -> bool:
        """
        Check if filename is safe (no path traversal, etc.).

        Args:
            filename: Filename to validate

        Returns:
            True if filename is safe
        """
        # Check for path traversal attempts
        if '..' in filename or '/' in filename or '\\' in filename:
            return False

        # Check for null bytes
        if '\x00' in filename:
            return False

        # Check for control characters
        if any(ord(c) < 32 for c in filename):
            return False

        # Check filename length
        if len(filename) > 255:
            return False

        # Check for reserved names (Windows)
        reserved_names = {
            'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4',
            'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2',
            'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        }
        name_without_ext = Path(filename).stem.upper()
        if name_without_ext in reserved_names:
            return False

        return True

    @staticmethod
    def sanitize_input(text: str, max_length: int = 1000) -> str:
        """
        Sanitize user input to prevent XSS and other attacks.

        Args:
            text: Input text to sanitize
            max_length: Maximum allowed length

        Returns:
            Sanitized text
        """
        if not text:
            return ""

        # Truncate if too long
        if len(text) > max_length:
            text = text[:max_length]

        # Remove HTML tags and potentially dangerous content
        cleaned = bleach.clean(
            text,
            tags=[],  # No HTML tags allowed
            attributes={},
            strip=True
        )

        return cleaned.strip()

    @staticmethod
    def validate_email(email: str) -> bool:
        """
        Validate email address format.

        Args:
            email: Email address to validate

        Returns:
            True if email is valid
        """
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    @staticmethod
    def validate_password_strength(password: str) -> Dict[str, Any]:
        """
        Validate password strength.

        Args:
            password: Password to validate

        Returns:
            Dict with validation results
        """
        issues = []
        score = 0

        if len(password) < 8:
            issues.append("Password must be at least 8 characters long")
        else:
            score += 1

        if not re.search(r'[a-z]', password):
            issues.append("Password must contain lowercase letters")
        else:
            score += 1

        if not re.search(r'[A-Z]', password):
            issues.append("Password must contain uppercase letters")
        else:
            score += 1

        if not re.search(r'\d', password):
            issues.append("Password must contain numbers")
        else:
            score += 1

        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            issues.append("Password must contain special characters")
        else:
            score += 1

        # Check for common patterns
        if re.search(r'(.)\1{2,}', password):
            issues.append("Password should not contain repeated characters")
            score -= 1

        strength_levels = ["Very Weak", "Weak", "Fair", "Good", "Strong"]
        strength = strength_levels[min(max(score, 0), 4)]

        return {
            "is_valid": len(issues) == 0,
            "strength": strength,
            "score": score,
            "issues": issues
        }

    @staticmethod
    def is_valid_ip_address(ip: str) -> bool:
        """
        Validate IP address format.

        Args:
            ip: IP address to validate

        Returns:
            True if IP is valid
        """
        try:
            ipaddress.ip_address(ip)
            return True
        except ValueError:
            return False

    @staticmethod
    def is_private_ip(ip: str) -> bool:
        """
        Check if IP address is private/internal.

        Args:
            ip: IP address to check

        Returns:
            True if IP is private
        """
        try:
            ip_obj = ipaddress.ip_address(ip)
            return ip_obj.is_private
        except ValueError:
            return False

    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """
        Generate a cryptographically secure random token.

        Args:
            length: Token length in bytes

        Returns:
            Hex-encoded secure token
        """
        return secrets.token_hex(length)

    @staticmethod
    def hash_sensitive_data(data: str, salt: Optional[str] = None) -> tuple[str, str]:
        """
        Hash sensitive data with salt.

        Args:
            data: Data to hash
            salt: Optional salt (generated if not provided)

        Returns:
            Tuple of (hash, salt)
        """
        if salt is None:
            salt = secrets.token_hex(16)

        # Use PBKDF2 for key derivation
        hash_obj = hashlib.pbkdf2_hmac(
            'sha256', data.encode(), salt.encode(), 100000)
        return hash_obj.hex(), salt

    @staticmethod
    def verify_hash(data: str, hash_value: str, salt: str) -> bool:
        """
        Verify hashed data.

        Args:
            data: Original data
            hash_value: Hash to verify against
            salt: Salt used for hashing

        Returns:
            True if hash matches
        """
        computed_hash, _ = SecurityValidator.hash_sensitive_data(data, salt)
        return secrets.compare_digest(computed_hash, hash_value)


class InputValidator:
    """Input validation utilities."""

    @staticmethod
    def validate_coordinates(lat: float, lng: float) -> bool:
        """Validate latitude and longitude coordinates."""
        return -90 <= lat <= 90 and -180 <= lng <= 180

    @staticmethod
    def validate_phone_number(phone: str) -> bool:
        """Validate phone number format (basic validation)."""
        # Remove common formatting characters
        cleaned = re.sub(r'[\s\-\(\)\+]', '', phone)
        # Check if it's all digits and reasonable length
        return cleaned.isdigit() and 10 <= len(cleaned) <= 15

    @staticmethod
    def validate_url(url: str) -> bool:
        """Validate URL format."""
        pattern = r'^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$'
        return bool(re.match(pattern, url))

    @staticmethod
    def validate_uuid(uuid_string: str) -> bool:
        """Validate UUID format."""
        pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        return bool(re.match(pattern, uuid_string.lower()))

    @staticmethod
    def validate_json_structure(data: Dict, required_fields: List[str]) -> List[str]:
        """
        Validate JSON structure has required fields.

        Args:
            data: JSON data to validate
            required_fields: List of required field names

        Returns:
            List of missing fields
        """
        missing_fields = []
        for field in required_fields:
            if field not in data or data[field] is None:
                missing_fields.append(field)
        return missing_fields

    @staticmethod
    def sanitize_and_validate_string(
        value: str,
        max_length: int = 255,
        min_length: int = 0,
        allow_html: bool = False,
        pattern: Optional[str] = None
    ) -> str:
        """
        Sanitize and validate string input.

        Args:
            value: String to validate
            max_length: Maximum allowed length
            min_length: Minimum required length
            allow_html: Whether to allow HTML tags
            pattern: Optional regex pattern to match

        Returns:
            Sanitized string

        Raises:
            HTTPException: If validation fails
        """
        if not isinstance(value, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Value must be a string"
            )

        # Check length constraints
        if len(value) < min_length:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Value must be at least {min_length} characters long"
            )

        if len(value) > max_length:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Value must not exceed {max_length} characters"
            )

        # Sanitize HTML if not allowed
        if not allow_html:
            value = bleach.clean(value, tags=[], attributes={}, strip=True)
        else:
            # Allow only safe HTML tags
            allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li']
            value = bleach.clean(value, tags=allowed_tags, strip=True)

        # HTML decode
        value = html.unescape(value)

        # Check pattern if provided
        if pattern and not re.match(pattern, value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Value does not match required format"
            )

        return value.strip()

    @staticmethod
    def validate_numeric_input(
        value: Union[int, float, str, Decimal],
        min_value: Optional[Union[int, float]] = None,
        max_value: Optional[Union[int, float]] = None,
        decimal_places: Optional[int] = None
    ) -> Union[int, float, Decimal]:
        """
        Validate and sanitize numeric input.

        Args:
            value: Numeric value to validate
            min_value: Minimum allowed value
            max_value: Maximum allowed value
            decimal_places: Maximum decimal places for Decimal values

        Returns:
            Validated numeric value

        Raises:
            HTTPException: If validation fails
        """
        try:
            # Convert string to appropriate numeric type
            if isinstance(value, str):
                if '.' in value or 'e' in value.lower():
                    if decimal_places is not None:
                        value = Decimal(value)
                    else:
                        value = float(value)
                else:
                    value = int(value)
            elif isinstance(value, Decimal) and decimal_places is not None:
                # Validate decimal places
                if value.as_tuple().exponent < -decimal_places:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Value cannot have more than {decimal_places} decimal places"
                    )

        except (ValueError, InvalidOperation):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid numeric value"
            )

        # Check range constraints
        if min_value is not None and value < min_value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Value must be at least {min_value}"
            )

        if max_value is not None and value > max_value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Value must not exceed {max_value}"
            )

        return value

    @staticmethod
    def validate_json_input(value: Union[str, Dict, List]) -> Union[Dict, List]:
        """
        Validate and parse JSON input.

        Args:
            value: JSON string or object to validate

        Returns:
            Parsed JSON object

        Raises:
            HTTPException: If JSON is invalid
        """
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid JSON format: {str(e)}"
                )

        if not isinstance(value, (dict, list)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="JSON must be an object or array"
            )

        return value

    @staticmethod
    def validate_enum_value(value: str, allowed_values: List[str], case_sensitive: bool = True) -> str:
        """
        Validate that value is in allowed enum values.

        Args:
            value: Value to validate
            allowed_values: List of allowed values
            case_sensitive: Whether comparison is case sensitive

        Returns:
            Validated value

        Raises:
            HTTPException: If value is not allowed
        """
        if not case_sensitive:
            value = value.lower()
            allowed_values = [v.lower() for v in allowed_values]

        if value not in allowed_values:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Value must be one of: {', '.join(allowed_values)}"
            )

        return value

    @staticmethod
    def validate_file_path(path: str, allowed_extensions: Optional[List[str]] = None) -> str:
        """
        Validate file path for security.

        Args:
            path: File path to validate
            allowed_extensions: List of allowed file extensions

        Returns:
            Validated path

        Raises:
            HTTPException: If path is invalid
        """
        # Check for path traversal
        if '..' in path or path.startswith('/') or '\\' in path:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file path"
            )

        # Check extension if specified
        if allowed_extensions:
            file_ext = Path(path).suffix.lower().lstrip('.')
            if file_ext not in [ext.lower() for ext in allowed_extensions]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File extension must be one of: {', '.join(allowed_extensions)}"
                )

        return path


# Global security validator instance
security_validator = SecurityValidator()
input_validator = InputValidator()
