# Developer Setup Guide

## Prerequisites

Before setting up the Swift Prints backend, ensure you have the following installed:

### Required Software

- **Python 3.10+**: [Download Python](https://www.python.org/downloads/)
- **Docker**: [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose**: [Install Docker Compose](https://docs.docker.com/compose/install/)
- **Git**: [Install Git](https://git-scm.com/downloads)
- **Redis**: [Install Redis](https://redis.io/download) (or use Docker)

### Optional but Recommended

- **PostgreSQL**: [Install PostgreSQL](https://www.postgresql.org/download/) (for production-like development)
- **AWS CLI**: [Install AWS CLI](https://aws.amazon.com/cli/) (if using S3 storage)
- **Postman**: [Download Postman](https://www.postman.com/downloads/) (for API testing)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd swift-prints/apps/backend
```

### 2. Set Up Python Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

### 4. Start Services with Docker

```bash
# Start Redis, PostgreSQL, and PrusaSlicer
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
sleep 10
```

### 5. Initialize Database

```bash
# Run database migrations
alembic upgrade head

# Seed initial data (optional)
python scripts/seed_data.py
```

### 6. Start the Development Server

```bash
# Start FastAPI server with hot reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## Detailed Setup Instructions

### Python Environment Setup

#### Using pyenv (Recommended)

```bash
# Install pyenv (macOS)
brew install pyenv

# Install Python 3.10
pyenv install 3.10.12
pyenv local 3.10.12

# Create virtual environment
python -m venv venv
source venv/bin/activate
```

#### Using conda

```bash
# Create conda environment
conda create -n swiftprints python=3.10
conda activate swiftprints

# Install pip dependencies
pip install -r requirements.txt
```

### Database Setup

#### SQLite (Development)

SQLite is used by default for development. No additional setup required.

```bash
# Database file will be created automatically at:
# ./data/swiftprints.db
```

#### PostgreSQL (Production-like)

```bash
# Start PostgreSQL with Docker
docker run -d \
  --name swiftprints-postgres \
  -e POSTGRES_DB=swiftprints \
  -e POSTGRES_USER=swiftprints \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15

# Update .env file
DATABASE_URL=postgresql://swiftprints:password@localhost:5432/swiftprints
```

### Redis Setup

#### Using Docker (Recommended)

```bash
# Start Redis container
docker run -d \
  --name swiftprints-redis \
  -p 6379:6379 \
  redis:7-alpine

# Update .env file
REDIS_URL=redis://localhost:6379/0
```

#### Local Installation

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt-get install redis-server
sudo systemctl start redis-server

# Update .env file
REDIS_URL=redis://localhost:6379/0
```

### PrusaSlicer Docker Setup

#### Build PrusaSlicer Image

```bash
# Build the PrusaSlicer Docker image
python scripts/build_prusaslicer.py

# Or build manually
docker build -f docker/Dockerfile.prusaslicer -t prusaslicer:latest .
```

#### Test PrusaSlicer Integration

```bash
# Test PrusaSlicer container
docker run --rm -v $(pwd)/test_files:/input -v $(pwd)/output:/output \
  prusaslicer:latest \
  --load /input/test.stl \
  --output /output/test.gcode \
  --slice
```

### Supabase Configuration

#### Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create a new project
3. Get your project URL and anon key
4. Update `.env` file:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

#### Set Up Authentication

```sql
-- Run in Supabase SQL Editor
-- Enable RLS on auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create user profiles table
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  role TEXT DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);
```

### Storage Configuration

#### Local Storage (Development)

```bash
# Create storage directory
mkdir -p storage/uploads
mkdir -p storage/analysis

# Update .env file
STORAGE_BACKEND=local
STORAGE_PATH=./storage
```

#### AWS S3 Storage (Production)

```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure

# Update .env file
STORAGE_BACKEND=s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BUCKET_NAME=swiftprints-storage
AWS_REGION=us-east-1
```

## Development Workflow

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-cov httpx

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run tests in watch mode
pytest-watch
```

### Code Quality

```bash
# Install development tools
pip install black isort flake8 mypy

# Format code
black app/
isort app/

# Check code style
flake8 app/

# Type checking
mypy app/
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Add new table"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# Check migration status
alembic current
```

### Background Tasks

```bash
# Start Celery worker
celery -A app.core.celery_app worker --loglevel=info

# Start Celery beat (scheduler)
celery -A app.core.celery_app beat --loglevel=info

# Monitor tasks
celery -A app.core.celery_app flower
```

## IDE Configuration

### VS Code

Create `.vscode/settings.json`:

```json
{
  "python.defaultInterpreterPath": "./venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "python.sortImports.args": ["--profile", "black"],
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/main.py",
      "console": "integratedTerminal",
      "env": {
        "PYTHONPATH": "${workspaceFolder}"
      }
    }
  ]
}
```

### PyCharm

1. Open project in PyCharm
2. Configure Python interpreter: `Settings > Project > Python Interpreter`
3. Select the virtual environment: `./venv/bin/python`
4. Configure code style: `Settings > Editor > Code Style > Python`
5. Set line length to 88 (Black default)

## Debugging

### FastAPI Debug Mode

```bash
# Start with debug logging
uvicorn main:app --reload --log-level debug

# Or set in .env
LOG_LEVEL=debug
```

### Database Debugging

```bash
# Enable SQL logging in .env
DATABASE_ECHO=true

# Use database shell
python -c "
from app.core.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text('SELECT * FROM users LIMIT 5'))
    print(list(result))
"
```

### Redis Debugging

```bash
# Connect to Redis CLI
redis-cli

# Monitor Redis commands
redis-cli monitor

# Check Redis keys
redis-cli keys "*"
```

### Docker Debugging

```bash
# View container logs
docker logs swiftprints-backend

# Execute commands in container
docker exec -it swiftprints-backend bash

# Check container resource usage
docker stats
```

## Performance Optimization

### Database Optimization

```bash
# Analyze slow queries
# Add to .env
DATABASE_ECHO=true
DATABASE_ECHO_POOL=true

# Create database indexes
python -c "
from app.core.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    conn.execute(text('CREATE INDEX idx_orders_status ON orders(status)'))
    conn.commit()
"
```

### Caching

```bash
# Monitor Redis cache hit rate
redis-cli info stats | grep keyspace

# Clear cache
redis-cli flushall
```

### Profiling

```bash
# Install profiling tools
pip install py-spy memory-profiler

# Profile CPU usage
py-spy record -o profile.svg -- python main.py

# Profile memory usage
mprof run python main.py
mprof plot
```

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>
```

#### Database Connection Issues

```bash
# Check database connection
python -c "
from app.core.database import engine
try:
    with engine.connect() as conn:
        print('Database connection successful')
except Exception as e:
    print(f'Database connection failed: {e}')
"
```

#### Docker Issues

```bash
# Reset Docker environment
docker-compose -f docker-compose.dev.yml down -v
docker system prune -f
docker-compose -f docker-compose.dev.yml up -d
```

#### Permission Issues

```bash
# Fix file permissions
chmod +x scripts/*.py
chmod -R 755 storage/
```

### Getting Help

1. Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Review application logs: `tail -f logs/app.log`
3. Check Docker logs: `docker-compose logs`
4. Search existing issues in the repository
5. Create a new issue with detailed error information

## Next Steps

After completing the setup:

1. Read the [API Documentation](API_DOCUMENTATION.md)
2. Review the [Configuration Guide](CONFIGURATION.md)
3. Check out the [Testing Guide](TESTING.md)
4. Explore the [Deployment Guide](DEPLOYMENT.md)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Run tests: `pytest`
5. Commit changes: `git commit -am 'Add new feature'`
6. Push to branch: `git push origin feature/new-feature`
7. Create a Pull Request
