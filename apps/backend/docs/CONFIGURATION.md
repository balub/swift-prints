# Configuration Guide

## Overview

The Swift Prints backend uses environment variables for configuration, allowing easy deployment across different environments (development, staging, production) without code changes.

## Environment Files

### File Locations

- **Development**: `.env` (local development)
- **Staging**: `.env.staging` (staging environment)
- **Production**: `.env.production` (production environment)

### Loading Priority

1. Environment variables (highest priority)
2. `.env.{ENVIRONMENT}` file
3. `.env` file
4. Default values (lowest priority)

## Core Configuration

### Application Settings

```bash
# Application Environment
ENVIRONMENT=development  # development, staging, production
DEBUG=true              # Enable debug mode (development only)
LOG_LEVEL=info         # debug, info, warning, error, critical

# Server Configuration
HOST=0.0.0.0           # Server host
PORT=8000              # Server port
WORKERS=1              # Number of worker processes (production)

# API Configuration
API_PREFIX=/api        # API route prefix
API_VERSION=v1         # API version
CORS_ORIGINS=*         # Allowed CORS origins (comma-separated)
```

### Database Configuration

```bash
# Database URL (SQLite for development, PostgreSQL for production)
DATABASE_URL=sqlite:///./data/swiftprints.db
# DATABASE_URL=postgresql://user:password@localhost:5432/swiftprints

# Database Connection Pool
DATABASE_POOL_SIZE=5           # Connection pool size
DATABASE_MAX_OVERFLOW=10       # Max overflow connections
DATABASE_POOL_TIMEOUT=30       # Connection timeout (seconds)
DATABASE_POOL_RECYCLE=3600     # Connection recycle time (seconds)

# Database Debugging
DATABASE_ECHO=false            # Log SQL queries
DATABASE_ECHO_POOL=false       # Log connection pool events
```

### Authentication Configuration

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret

# JWT Configuration
JWT_ALGORITHM=HS256            # JWT signing algorithm
JWT_EXPIRE_MINUTES=1440        # Token expiration (24 hours)
JWT_REFRESH_EXPIRE_DAYS=30     # Refresh token expiration

# Session Configuration
SESSION_SECRET_KEY=your-secret-key-here
SESSION_EXPIRE_MINUTES=60      # Session timeout
```

### Storage Configuration

```bash
# Storage Backend (local or s3)
STORAGE_BACKEND=local

# Local Storage Configuration
STORAGE_PATH=./storage         # Local storage directory
MAX_FILE_SIZE=52428800        # Max file size (50MB)
ALLOWED_FILE_TYPES=stl,obj,3mf # Allowed file extensions

# AWS S3 Configuration (when STORAGE_BACKEND=s3)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BUCKET_NAME=swiftprints-storage
AWS_REGION=us-east-1
AWS_S3_ENDPOINT_URL=           # Custom S3 endpoint (optional)
S3_PRESIGNED_URL_EXPIRE=3600   # Presigned URL expiration (1 hour)
```

### Cache Configuration

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=                # Redis password (if required)
REDIS_SSL=false               # Use SSL for Redis connection

# Cache Settings
CACHE_TTL=3600                # Default cache TTL (1 hour)
PRICING_CACHE_TTL=1800        # Pricing cache TTL (30 minutes)
MAKER_CACHE_TTL=7200          # Maker data cache TTL (2 hours)
```

### Task Queue Configuration

```bash
# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# Task Settings
CELERY_TASK_SERIALIZER=json
CELERY_RESULT_SERIALIZER=json
CELERY_ACCEPT_CONTENT=json
CELERY_TIMEZONE=UTC

# Analysis Task Configuration
ANALYSIS_TIMEOUT=1800          # Analysis timeout (30 minutes)
MAX_CONCURRENT_ANALYSIS=5      # Max concurrent analysis tasks
ANALYSIS_RETRY_DELAY=60        # Retry delay for failed analysis
```

### PrusaSlicer Configuration

```bash
# PrusaSlicer Docker Configuration
PRUSASLICER_IMAGE=prusaslicer:latest
PRUSASLICER_TIMEOUT=1800       # Slicing timeout (30 minutes)
PRUSASLICER_MEMORY_LIMIT=2g    # Memory limit for container
PRUSASLICER_CPU_LIMIT=2        # CPU limit for container

# Slicing Configuration
DEFAULT_LAYER_HEIGHT=0.2       # Default layer height (mm)
DEFAULT_INFILL_DENSITY=20      # Default infill density (%)
DEFAULT_PRINT_SPEED=50         # Default print speed (mm/s)
DEFAULT_NOZZLE_TEMP=210        # Default nozzle temperature (°C)
DEFAULT_BED_TEMP=60           # Default bed temperature (°C)
```

### Rate Limiting Configuration

```bash
# Rate Limiting
RATE_LIMIT_ENABLED=true        # Enable rate limiting
RATE_LIMIT_REQUESTS=1000       # Requests per hour per user
RATE_LIMIT_UPLOAD=10          # File uploads per hour per user
RATE_LIMIT_ANALYSIS=5         # Analysis requests per hour per user

# Rate Limit Storage
RATE_LIMIT_STORAGE=redis       # Storage backend for rate limits
RATE_LIMIT_KEY_PREFIX=rl:      # Redis key prefix for rate limits
```

### Security Configuration

```bash
# Security Settings
SECRET_KEY=your-super-secret-key-here
SECURITY_PASSWORD_SALT=your-password-salt

# CORS Configuration
CORS_ALLOW_ORIGINS=*           # Allowed origins (comma-separated)
CORS_ALLOW_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOW_HEADERS=*
CORS_ALLOW_CREDENTIALS=true

# Security Headers
SECURITY_HEADERS_ENABLED=true
HSTS_MAX_AGE=31536000         # HSTS max age (1 year)
CONTENT_TYPE_NOSNIFF=true     # X-Content-Type-Options
FRAME_OPTIONS=DENY            # X-Frame-Options
XSS_PROTECTION=true           # X-XSS-Protection
```

### Monitoring and Logging Configuration

```bash
# Logging Configuration
LOG_FORMAT=json               # Log format (json or text)
LOG_FILE=logs/app.log        # Log file path
LOG_MAX_SIZE=10MB            # Max log file size
LOG_BACKUP_COUNT=5           # Number of backup log files

# Monitoring
METRICS_ENABLED=true         # Enable metrics collection
METRICS_PORT=9090           # Metrics server port
HEALTH_CHECK_ENABLED=true   # Enable health check endpoint

# Error Tracking
SENTRY_DSN=                 # Sentry DSN for error tracking
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Email Configuration

```bash
# Email Settings (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=true
SMTP_FROM_EMAIL=noreply@swiftprints.com
SMTP_FROM_NAME=Swift Prints

# Email Templates
EMAIL_TEMPLATE_DIR=templates/email
```

### WebSocket Configuration

```bash
# WebSocket Settings
WEBSOCKET_ENABLED=true        # Enable WebSocket support
WEBSOCKET_PATH=/ws           # WebSocket endpoint path
WEBSOCKET_MAX_CONNECTIONS=1000 # Max concurrent connections
WEBSOCKET_PING_INTERVAL=30    # Ping interval (seconds)
WEBSOCKET_PING_TIMEOUT=10     # Ping timeout (seconds)
```

## Environment-Specific Configurations

### Development Environment

```bash
# .env (development)
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=debug
DATABASE_URL=sqlite:///./data/swiftprints.db
STORAGE_BACKEND=local
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
RATE_LIMIT_ENABLED=false
```

### Staging Environment

```bash
# .env.staging
ENVIRONMENT=staging
DEBUG=false
LOG_LEVEL=info
DATABASE_URL=postgresql://user:password@staging-db:5432/swiftprints
STORAGE_BACKEND=s3
AWS_BUCKET_NAME=swiftprints-staging
REDIS_URL=redis://staging-redis:6379/0
CORS_ORIGINS=https://staging.swiftprints.com
RATE_LIMIT_ENABLED=true
```

### Production Environment

```bash
# .env.production
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=warning
DATABASE_URL=postgresql://user:password@prod-db:5432/swiftprints
STORAGE_BACKEND=s3
AWS_BUCKET_NAME=swiftprints-production
REDIS_URL=redis://prod-redis:6379/0
CORS_ORIGINS=https://swiftprints.com
RATE_LIMIT_ENABLED=true
WORKERS=4
```

## Configuration Validation

The application validates configuration on startup and will fail to start if required settings are missing or invalid.

### Required Settings

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_JWT_SECRET`
- `SECRET_KEY`
- `REDIS_URL` (if caching enabled)

### Validation Rules

```python
# Example validation in app/core/config.py
from pydantic import BaseSettings, validator

class Settings(BaseSettings):
    database_url: str
    supabase_url: str
    supabase_key: str

    @validator('database_url')
    def validate_database_url(cls, v):
        if not v.startswith(('sqlite:', 'postgresql:')):
            raise ValueError('DATABASE_URL must start with sqlite: or postgresql:')
        return v

    @validator('supabase_url')
    def validate_supabase_url(cls, v):
        if not v.startswith('https://'):
            raise ValueError('SUPABASE_URL must be a valid HTTPS URL')
        return v
```

## Configuration Management

### Using Environment Variables

```bash
# Set environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/swiftprints"
export SUPABASE_URL="https://your-project.supabase.co"

# Run application
python main.py
```

### Using Docker

```yaml
# docker-compose.yml
version: "3.8"
services:
  backend:
    build: .
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/swiftprints
      - REDIS_URL=redis://redis:6379/0
    env_file:
      - .env.production
```

### Using Kubernetes

```yaml
# k8s-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: swiftprints-config
data:
  DATABASE_URL: "postgresql://user:password@db:5432/swiftprints"
  REDIS_URL: "redis://redis:6379/0"
---
apiVersion: v1
kind: Secret
metadata:
  name: swiftprints-secrets
type: Opaque
stringData:
  SUPABASE_KEY: "your-secret-key"
  SECRET_KEY: "your-super-secret-key"
```

## Configuration Best Practices

### Security

1. **Never commit secrets**: Use `.env.example` for templates
2. **Use strong secrets**: Generate random keys for production
3. **Rotate secrets regularly**: Update keys periodically
4. **Limit access**: Restrict who can view production configs

### Performance

1. **Tune connection pools**: Adjust based on load
2. **Configure caching**: Set appropriate TTL values
3. **Optimize timeouts**: Balance responsiveness and reliability
4. **Monitor resources**: Track CPU, memory, and disk usage

### Reliability

1. **Set reasonable timeouts**: Prevent hanging operations
2. **Configure retries**: Handle transient failures
3. **Enable health checks**: Monitor service health
4. **Use circuit breakers**: Prevent cascade failures

### Monitoring

1. **Enable logging**: Capture important events
2. **Set up metrics**: Track performance indicators
3. **Configure alerts**: Get notified of issues
4. **Use structured logging**: Make logs searchable

## Troubleshooting Configuration

### Common Issues

#### Invalid Database URL

```bash
# Error: Invalid database URL format
# Solution: Check URL format
DATABASE_URL=postgresql://username:password@host:port/database
```

#### Missing Environment Variables

```bash
# Error: Required environment variable not set
# Solution: Check .env file or set environment variable
export SUPABASE_URL="https://your-project.supabase.co"
```

#### Redis Connection Failed

```bash
# Error: Redis connection failed
# Solution: Check Redis URL and ensure Redis is running
REDIS_URL=redis://localhost:6379/0
docker run -d -p 6379:6379 redis:alpine
```

#### File Permission Issues

```bash
# Error: Permission denied writing to storage
# Solution: Fix directory permissions
chmod -R 755 storage/
chown -R $USER:$USER storage/
```

### Configuration Testing

```bash
# Test configuration
python -c "
from app.core.config import settings
print('Configuration loaded successfully')
print(f'Environment: {settings.environment}')
print(f'Database: {settings.database_url}')
print(f'Storage: {settings.storage_backend}')
"
```

### Environment Variable Debugging

```bash
# List all environment variables
env | grep -E "(DATABASE|SUPABASE|REDIS|STORAGE)"

# Check specific variable
echo $DATABASE_URL

# Test variable in Python
python -c "import os; print(os.getenv('DATABASE_URL', 'Not set'))"
```

## Configuration Reference

For a complete list of all configuration options, see the `app/core/config.py` file in the source code. This file contains the definitive configuration schema with default values and validation rules.
