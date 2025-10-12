# Troubleshooting Guide

## Common Issues and Solutions

### Application Startup Issues

#### Issue: Application fails to start with "Database connection failed"

**Symptoms:**

```
sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) unable to open database file
```

**Solutions:**

1. **Check database URL format:**

   ```bash
   # Correct SQLite format
   DATABASE_URL=sqlite:///./data/swiftprints.db

   # Correct PostgreSQL format
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   ```

2. **Ensure database directory exists:**

   ```bash
   mkdir -p data
   chmod 755 data
   ```

3. **For PostgreSQL, ensure service is running:**

   ```bash
   # Check if PostgreSQL is running
   pg_isready -h localhost -p 5432

   # Start PostgreSQL with Docker
   docker run -d --name postgres \
     -e POSTGRES_DB=swiftprints \
     -e POSTGRES_USER=swiftprints \
     -e POSTGRES_PASSWORD=password \
     -p 5432:5432 postgres:15
   ```

#### Issue: "Redis connection failed"

**Symptoms:**

```
redis.exceptions.ConnectionError: Error 111 connecting to localhost:6379. Connection refused.
```

**Solutions:**

1. **Start Redis server:**

   ```bash
   # Using Docker
   docker run -d --name redis -p 6379:6379 redis:alpine

   # Using local installation
   redis-server
   ```

2. **Check Redis URL format:**

   ```bash
   REDIS_URL=redis://localhost:6379/0
   ```

3. **Test Redis connection:**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

#### Issue: "Supabase authentication failed"

**Symptoms:**

```
supabase.exceptions.AuthError: Invalid JWT token
```

**Solutions:**

1. **Verify Supabase configuration:**

   ```bash
   # Check environment variables
   echo $SUPABASE_URL
   echo $SUPABASE_KEY
   ```

2. **Test Supabase connection:**

   ```python
   from supabase import create_client

   supabase = create_client(
       "https://your-project.supabase.co",
       "your-anon-key"
   )

   # Test connection
   response = supabase.table('users').select('*').limit(1).execute()
   print("Connection successful")
   ```

3. **Check JWT secret:**
   ```bash
   # JWT secret should match Supabase project settings
   SUPABASE_JWT_SECRET=your-jwt-secret
   ```

### File Upload Issues

#### Issue: "File upload fails with 413 Request Entity Too Large"

**Symptoms:**

```
413 Request Entity Too Large
```

**Solutions:**

1. **Check file size limits:**

   ```bash
   # In .env file
   MAX_FILE_SIZE=52428800  # 50MB in bytes
   ```

2. **Configure nginx (if using):**

   ```nginx
   # nginx.conf
   client_max_body_size 50M;
   ```

3. **Check FastAPI configuration:**
   ```python
   # In main.py
   app.add_middleware(
       TrustedHostMiddleware,
       allowed_hosts=["*"]
   )
   ```

#### Issue: "Storage backend not accessible"

**Symptoms:**

```
FileNotFoundError: Storage path not accessible
```

**Solutions:**

1. **For local storage:**

   ```bash
   # Create storage directory
   mkdir -p storage/uploads
   chmod -R 755 storage/
   ```

2. **For S3 storage:**

   ```bash
   # Test AWS credentials
   aws s3 ls s3://your-bucket-name

   # Check environment variables
   echo $AWS_ACCESS_KEY_ID
   echo $AWS_SECRET_ACCESS_KEY
   echo $AWS_BUCKET_NAME
   ```

3. **Verify storage backend setting:**
   ```bash
   STORAGE_BACKEND=local  # or s3
   ```

### STL Analysis Issues

#### Issue: "PrusaSlicer container not found"

**Symptoms:**

```
docker.errors.ImageNotFound: 404 Client Error: Not Found ("No such image: prusaslicer:latest")
```

**Solutions:**

1. **Build PrusaSlicer image:**

   ```bash
   python scripts/build_prusaslicer.py
   ```

2. **Or build manually:**

   ```bash
   docker build -f docker/Dockerfile.prusaslicer -t prusaslicer:latest .
   ```

3. **Verify image exists:**
   ```bash
   docker images | grep prusaslicer
   ```

#### Issue: "Analysis timeout"

**Symptoms:**

```
celery.exceptions.SoftTimeLimitExceeded: SoftTimeLimitExceeded()
```

**Solutions:**

1. **Increase timeout:**

   ```bash
   ANALYSIS_TIMEOUT=3600  # 1 hour
   ```

2. **Check file complexity:**

   ```bash
   # Large or complex files may need more time
   # Consider file size and polygon count
   ```

3. **Monitor system resources:**
   ```bash
   # Check available memory and CPU
   docker stats
   htop
   ```

### Database Issues

#### Issue: "Migration failed"

**Symptoms:**

```
alembic.util.exc.CommandError: Can't locate revision identified by 'abc123'
```

**Solutions:**

1. **Check migration status:**

   ```bash
   alembic current
   alembic history
   ```

2. **Reset migrations (development only):**

   ```bash
   # WARNING: This will delete all data
   rm -rf alembic/versions/*.py
   alembic revision --autogenerate -m "Initial migration"
   alembic upgrade head
   ```

3. **Manual migration fix:**

   ```bash
   # Stamp current revision
   alembic stamp head

   # Create new migration
   alembic revision --autogenerate -m "Fix migration"
   ```

#### Issue: "Database locked" (SQLite)

**Symptoms:**

```
sqlite3.OperationalError: database is locked
```

**Solutions:**

1. **Close all database connections:**

   ```bash
   # Restart the application
   pkill -f "uvicorn main:app"
   ```

2. **Check for long-running transactions:**

   ```python
   # In Python shell
   from app.core.database import engine
   with engine.connect() as conn:
       result = conn.execute("PRAGMA busy_timeout = 30000")
   ```

3. **Switch to PostgreSQL for production:**
   ```bash
   DATABASE_URL=postgresql://user:password@localhost:5432/swiftprints
   ```

### Performance Issues

#### Issue: "Slow API responses"

**Symptoms:**

- API responses taking > 5 seconds
- High CPU usage
- Memory leaks

**Solutions:**

1. **Enable query logging:**

   ```bash
   DATABASE_ECHO=true
   LOG_LEVEL=debug
   ```

2. **Check database indexes:**

   ```sql
   -- Add indexes for frequently queried columns
   CREATE INDEX idx_orders_status ON orders(status);
   CREATE INDEX idx_makers_location ON makers(location_lat, location_lng);
   ```

3. **Monitor with profiling:**

   ```bash
   # Install profiling tools
   pip install py-spy

   # Profile running application
   py-spy record -o profile.svg --pid <process_id>
   ```

4. **Optimize database queries:**
   ```python
   # Use select_related for joins
   query = session.query(Order).options(
       selectinload(Order.maker),
       selectinload(Order.file)
   )
   ```

#### Issue: "High memory usage"

**Symptoms:**

```
MemoryError: Unable to allocate memory
```

**Solutions:**

1. **Monitor memory usage:**

   ```bash
   # Check memory usage
   free -h
   docker stats
   ```

2. **Optimize file processing:**

   ```python
   # Process files in chunks
   def process_large_file(file_path):
       with open(file_path, 'rb') as f:
           while True:
               chunk = f.read(8192)  # 8KB chunks
               if not chunk:
                   break
               process_chunk(chunk)
   ```

3. **Configure memory limits:**

   ```bash
   # Docker memory limit
   docker run --memory=2g your-app

   # Python memory limit
   import resource
   resource.setrlimit(resource.RLIMIT_AS, (2**30, 2**30))  # 1GB
   ```

### Authentication Issues

#### Issue: "JWT token validation failed"

**Symptoms:**

```
jose.exceptions.JWTError: Invalid token
```

**Solutions:**

1. **Check token format:**

   ```bash
   # Token should be in format: Bearer <token>
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Verify JWT secret:**

   ```python
   # Test JWT decoding
   import jwt

   token = "your-jwt-token"
   secret = "your-jwt-secret"

   try:
       payload = jwt.decode(token, secret, algorithms=["HS256"])
       print("Token valid:", payload)
   except jwt.InvalidTokenError as e:
       print("Token invalid:", e)
   ```

3. **Check token expiration:**

   ```python
   import jwt
   from datetime import datetime

   payload = jwt.decode(token, options={"verify_signature": False})
   exp = datetime.fromtimestamp(payload['exp'])
   print(f"Token expires at: {exp}")
   ```

### Docker Issues

#### Issue: "Container fails to start"

**Symptoms:**

```
docker: Error response from daemon: Container command not found
```

**Solutions:**

1. **Check Dockerfile:**

   ```dockerfile
   # Ensure proper base image and commands
   FROM python:3.10-slim

   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt

   COPY . .
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

2. **Build image with verbose output:**

   ```bash
   docker build --no-cache -t swiftprints-backend .
   ```

3. **Check container logs:**
   ```bash
   docker logs <container_id>
   ```

#### Issue: "Docker compose services not communicating"

**Symptoms:**

```
requests.exceptions.ConnectionError: HTTPConnectionPool(host='db', port=5432)
```

**Solutions:**

1. **Check service names in docker-compose.yml:**

   ```yaml
   services:
     backend:
       depends_on:
         - db
         - redis
     db:
       image: postgres:15
     redis:
       image: redis:alpine
   ```

2. **Use service names in connection strings:**

   ```bash
   DATABASE_URL=postgresql://user:password@db:5432/swiftprints
   REDIS_URL=redis://redis:6379/0
   ```

3. **Check network connectivity:**
   ```bash
   # Test from within container
   docker exec -it backend ping db
   docker exec -it backend ping redis
   ```

### WebSocket Issues

#### Issue: "WebSocket connection failed"

**Symptoms:**

```
WebSocket connection failed: Error during WebSocket handshake
```

**Solutions:**

1. **Check WebSocket endpoint:**

   ```javascript
   // Correct WebSocket URL
   const ws = new WebSocket("ws://localhost:8000/ws");
   ```

2. **Verify CORS settings:**

   ```python
   # In main.py
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

3. **Check proxy configuration (nginx):**
   ```nginx
   location /ws {
       proxy_pass http://backend;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

## Debugging Tools and Techniques

### Logging

#### Enable Debug Logging

```bash
# In .env file
LOG_LEVEL=debug
DATABASE_ECHO=true
```

#### View Logs

```bash
# Application logs
tail -f logs/app.log

# Docker logs
docker logs -f swiftprints-backend

# System logs
journalctl -u swiftprints -f
```

### Database Debugging

#### SQLite Browser

```bash
# Install SQLite browser
sudo apt-get install sqlitebrowser

# Open database
sqlitebrowser data/swiftprints.db
```

#### PostgreSQL Debugging

```bash
# Connect to database
psql -h localhost -U swiftprints -d swiftprints

# Check active connections
SELECT * FROM pg_stat_activity;

# Check table sizes
SELECT schemaname,tablename,attname,n_distinct,correlation
FROM pg_stats WHERE tablename = 'orders';
```

### Network Debugging

#### Check Port Usage

```bash
# Check if port is in use
netstat -tulpn | grep :8000
lsof -i :8000

# Kill process using port
kill -9 $(lsof -t -i:8000)
```

#### Test API Endpoints

```bash
# Test health endpoint
curl -v http://localhost:8000/health

# Test with authentication
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/orders
```

### Performance Debugging

#### Memory Profiling

```bash
# Install memory profiler
pip install memory-profiler

# Profile memory usage
mprof run python main.py
mprof plot
```

#### CPU Profiling

```bash
# Install py-spy
pip install py-spy

# Profile CPU usage
py-spy record -o profile.svg --pid $(pgrep -f "uvicorn main:app")
```

## Getting Help

### Before Asking for Help

1. **Check logs**: Review application and system logs
2. **Search documentation**: Check this guide and API docs
3. **Test in isolation**: Reproduce the issue with minimal setup
4. **Gather information**: Collect error messages, logs, and configuration

### Information to Include

When reporting issues, include:

1. **Environment details**:

   - Operating system and version
   - Python version
   - Docker version (if applicable)
   - Package versions (`pip freeze`)

2. **Configuration**:

   - Relevant environment variables (redact secrets)
   - Docker compose configuration
   - Nginx configuration (if applicable)

3. **Error details**:

   - Complete error messages
   - Stack traces
   - Log entries around the time of error

4. **Steps to reproduce**:
   - Exact commands run
   - Input data used
   - Expected vs actual behavior

### Support Channels

1. **Documentation**: Check all documentation files
2. **Issue tracker**: Search existing issues on GitHub
3. **Community forums**: Ask questions in community channels
4. **Professional support**: Contact support team for critical issues

### Emergency Procedures

#### Service Down

1. **Check service status**: `systemctl status swiftprints`
2. **Review recent logs**: `journalctl -u swiftprints --since "1 hour ago"`
3. **Restart service**: `systemctl restart swiftprints`
4. **Check dependencies**: Verify database and Redis are running

#### Data Corruption

1. **Stop application immediately**
2. **Create database backup**: `pg_dump swiftprints > backup.sql`
3. **Assess damage**: Check data integrity
4. **Restore from backup if necessary**
5. **Investigate root cause**

#### Security Incident

1. **Isolate affected systems**
2. **Change all passwords and API keys**
3. **Review access logs**
4. **Update security configurations**
5. **Monitor for suspicious activity**
