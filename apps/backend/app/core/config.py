"""
Application configuration management using Pydantic settings.
"""
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # Application
    app_name: str = "Swift Prints Backend"
    app_version: str = "0.1.0"
    debug: bool = False

    # Database
    database_url: str = Field(
        default="sqlite:///./swift_prints.db",
        description="Database connection URL"
    )

    # Redis
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL for caching"
    )

    # Supabase Auth
    supabase_url: str = Field(
        default="",
        description="Supabase project URL"
    )
    supabase_key: str = Field(
        default="",
        description="Supabase anon/service key"
    )

    # Storage Configuration
    storage_backend: str = Field(
        default="local",
        description="Storage backend: 'local' or 's3'"
    )

    # AWS S3 Configuration (optional)
    aws_access_key: Optional[str] = Field(
        default=None,
        description="AWS access key for S3 storage"
    )
    aws_secret_key: Optional[str] = Field(
        default=None,
        description="AWS secret key for S3 storage"
    )
    aws_bucket: Optional[str] = Field(
        default=None,
        description="AWS S3 bucket name"
    )
    aws_region: str = Field(
        default="us-east-1",
        description="AWS region"
    )

    # File Upload
    max_file_size: int = Field(
        default=50 * 1024 * 1024,  # 50MB
        description="Maximum file size in bytes"
    )
    upload_dir: str = Field(
        default="./uploads",
        description="Local upload directory"
    )

    # PrusaSlicer
    prusa_slicer_image: str = Field(
        default="prusaslicer:latest",
        description="Docker image for PrusaSlicer"
    )

    # Celery Configuration
    celery_broker_url: str = Field(
        default="redis://localhost:6379/1",
        description="Celery broker URL"
    )
    celery_result_backend: str = Field(
        default="redis://localhost:6379/1",
        description="Celery result backend URL"
    )

    # Security
    secret_key: str = Field(
        default="your-secret-key-change-in-production",
        description="Secret key for JWT and other cryptographic operations"
    )

    # Rate limiting
    rate_limit_enabled: bool = Field(
        default=True,
        description="Enable rate limiting"
    )
    default_rate_limit: int = Field(
        default=100,
        description="Default rate limit per minute"
    )

    # Performance
    enable_caching: bool = Field(
        default=True,
        description="Enable Redis caching"
    )
    cache_ttl_default: int = Field(
        default=3600,
        description="Default cache TTL in seconds"
    )
    enable_performance_monitoring: bool = Field(
        default=True,
        description="Enable performance monitoring"
    )

    # Database connection pooling
    db_pool_size: int = Field(
        default=20,
        description="Database connection pool size"
    )
    db_max_overflow: int = Field(
        default=30,
        description="Database connection pool max overflow"
    )
    db_pool_timeout: int = Field(
        default=30,
        description="Database connection pool timeout"
    )

    # CORS
    allowed_origins: list[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000"],
        description="Allowed CORS origins"
    )
    cors_allow_credentials: bool = Field(
        default=True,
        description="Allow credentials in CORS requests"
    )
    cors_max_age: int = Field(
        default=86400,
        description="CORS preflight cache max age"
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
_settings = None


def get_settings() -> Settings:
    """Get application settings instance."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


# Backward compatibility
settings = get_settings()
