# Deployment and Scaling Guide

## Overview

This guide covers deploying the Swift Prints backend across different environments, from development to production, including scaling strategies and best practices.

## Deployment Options

### 1. Docker Deployment (Recommended)

#### Single Container Deployment

```bash
# Build the Docker image
docker build -t swiftprints-backend .

# Run with environment variables
docker run -d \
  --name swiftprints-backend \
  -p 8000:8000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/swiftprints" \
  -e REDIS_URL="redis://redis:6379/0" \
  -e SUPABASE_URL="https://your-project.supabase.co" \
  -e SUPABASE_KEY="your-key" \
  swiftprints-backend
```

#### Docker Compose Deployment

```yaml
# docker-compose.production.yml
version: "3.8"

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://swiftprints:${DB_PASSWORD}@db:5432/swiftprints
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    volumes:
      - ./storage:/app/storage
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=swiftprints
      - POSTGRES_USER=swiftprints
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    restart: unless-stopped

  worker:
    build: .
    command: celery -A app.core.celery_app worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://swiftprints:${DB_PASSWORD}@db:5432/swiftprints
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    volumes:
      - ./storage:/app/storage
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

```bash
# Deploy with Docker Compose
docker-compose -f docker-compose.production.yml up -d
```

### 2. Kubernetes Deployment

#### Namespace and ConfigMap

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: swiftprints

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: swiftprints-config
  namespace: swiftprints
data:
  ENVIRONMENT: "production"
  LOG_LEVEL: "info"
  STORAGE_BACKEND: "s3"
  AWS_REGION: "us-east-1"
  CORS_ORIGINS: "https://swiftprints.com"
```

#### Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: swiftprints-secrets
  namespace: swiftprints
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:password@postgres:5432/swiftprints"
  REDIS_URL: "redis://redis:6379/0"
  SUPABASE_URL: "https://your-project.supabase.co"
  SUPABASE_KEY: "your-key"
  SUPABASE_JWT_SECRET: "your-jwt-secret"
  SECRET_KEY: "your-secret-key"
  AWS_ACCESS_KEY_ID: "your-access-key"
  AWS_SECRET_ACCESS_KEY: "your-secret-key"
```

#### Backend Deployment

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: swiftprints-backend
  namespace: swiftprints
spec:
  replicas: 3
  selector:
    matchLabels:
      app: swiftprints-backend
  template:
    metadata:
      labels:
        app: swiftprints-backend
    spec:
      containers:
        - name: backend
          image: swiftprints-backend:latest
          ports:
            - containerPort: 8000
          envFrom:
            - configMapRef:
                name: swiftprints-config
            - secretRef:
                name: swiftprints-secrets
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5

---
# k8s/backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: swiftprints-backend-service
  namespace: swiftprints
spec:
  selector:
    app: swiftprints-backend
  ports:
    - port: 80
      targetPort: 8000
  type: ClusterIP
```

#### Worker Deployment

```yaml
# k8s/worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: swiftprints-worker
  namespace: swiftprints
spec:
  replicas: 2
  selector:
    matchLabels:
      app: swiftprints-worker
  template:
    metadata:
      labels:
        app: swiftprints-worker
    spec:
      containers:
        - name: worker
          image: swiftprints-backend:latest
          command:
            ["celery", "-A", "app.core.celery_app", "worker", "--loglevel=info"]
          envFrom:
            - configMapRef:
                name: swiftprints-config
            - secretRef:
                name: swiftprints-secrets
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
```

#### Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: swiftprints-ingress
  namespace: swiftprints
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  tls:
    - hosts:
        - api.swiftprints.com
      secretName: swiftprints-tls
  rules:
    - host: api.swiftprints.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: swiftprints-backend-service
                port:
                  number: 80
```

### 3. Cloud Platform Deployments

#### AWS ECS Deployment

```json
{
  "family": "swiftprints-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "your-account.dkr.ecr.region.amazonaws.com/swiftprints-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ENVIRONMENT",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:swiftprints/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/swiftprints-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Google Cloud Run Deployment

```yaml
# cloudrun.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: swiftprints-backend
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/cpu-throttling: "false"
        run.googleapis.com/memory: "1Gi"
        run.googleapis.com/cpu: "1000m"
    spec:
      containers:
        - image: gcr.io/project-id/swiftprints-backend:latest
          ports:
            - containerPort: 8000
          env:
            - name: ENVIRONMENT
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: swiftprints-secrets
                  key: database-url
```

```bash
# Deploy to Cloud Run
gcloud run deploy swiftprints-backend \
  --image gcr.io/project-id/swiftprints-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10
```

## Environment-Specific Configurations

### Development Environment

```bash
# .env.development
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=debug
DATABASE_URL=sqlite:///./data/swiftprints.db
STORAGE_BACKEND=local
WORKERS=1
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
WORKERS=2
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
WORKERS=4
RATE_LIMIT_ENABLED=true
SECURITY_HEADERS_ENABLED=true
```

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.10"

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov

      - name: Run tests
        run: pytest --cov=app

      - name: Run security scan
        run: |
          pip install bandit safety
          bandit -r app/
          safety check

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: |
          docker build -t swiftprints-backend:${{ github.sha }} .
          docker tag swiftprints-backend:${{ github.sha }} swiftprints-backend:latest

      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push swiftprints-backend:${{ github.sha }}
          docker push swiftprints-backend:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          # Deploy using your preferred method
          # kubectl, docker-compose, etc.
```

### GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

test:
  stage: test
  image: python:3.10
  script:
    - pip install -r requirements.txt
    - pytest --cov=app
    - bandit -r app/

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $DOCKER_IMAGE .
    - docker push $DOCKER_IMAGE

deploy_production:
  stage: deploy
  image: alpine/kubectl:latest
  script:
    - kubectl set image deployment/swiftprints-backend backend=$DOCKER_IMAGE
    - kubectl rollout status deployment/swiftprints-backend
  only:
    - main
```

## Scaling Strategies

### Horizontal Scaling

#### Application Scaling

```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: swiftprints-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: swiftprints-backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

#### Worker Scaling

```yaml
# Worker HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: swiftprints-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: swiftprints-worker
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: External
      external:
        metric:
          name: redis_queue_length
        target:
          type: Value
          value: "10"
```

### Vertical Scaling

#### Resource Optimization

```yaml
# Optimized resource allocation
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

### Database Scaling

#### Read Replicas

```python
# Database configuration with read replicas
DATABASES = {
    'default': {
        'ENGINE': 'postgresql',
        'HOST': 'primary-db.example.com',
        'PORT': 5432,
        'OPTIONS': {'sslmode': 'require'},
    },
    'read_replica': {
        'ENGINE': 'postgresql',
        'HOST': 'replica-db.example.com',
        'PORT': 5432,
        'OPTIONS': {'sslmode': 'require'},
    }
}
```

#### Connection Pooling

```python
# SQLAlchemy connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
    pool_recycle=3600
)
```

### Caching Strategies

#### Redis Cluster

```yaml
# Redis cluster configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-cluster-config
data:
  redis.conf: |
    cluster-enabled yes
    cluster-config-file nodes.conf
    cluster-node-timeout 5000
    appendonly yes
```

#### CDN Integration

```python
# CDN configuration for file storage
CDN_SETTINGS = {
    'cloudfront_domain': 'cdn.swiftprints.com',
    'cache_control': 'public, max-age=31536000',
    'signed_urls': True
}
```

## Monitoring and Observability

### Health Checks

```python
# Health check endpoint
@app.get("/health")
async def health_check():
    checks = {
        "database": await check_database(),
        "redis": await check_redis(),
        "storage": await check_storage(),
        "prusaslicer": await check_prusaslicer()
    }

    status = "healthy" if all(checks.values()) else "unhealthy"
    return {"status": status, "checks": checks}
```

### Metrics Collection

```yaml
# Prometheus configuration
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "swiftprints-backend"
    static_configs:
      - targets: ["backend:8000"]
    metrics_path: "/metrics"
```

### Logging

```python
# Structured logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            'format': '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s", "module": "%(name)s"}'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json'
        }
    },
    'root': {
        'level': 'INFO',
        'handlers': ['console']
    }
}
```

## Security Considerations

### SSL/TLS Configuration

```nginx
# nginx SSL configuration
server {
    listen 443 ssl http2;
    server_name api.swiftprints.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
}
```

### Network Security

```yaml
# Kubernetes Network Policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: swiftprints-network-policy
spec:
  podSelector:
    matchLabels:
      app: swiftprints-backend
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: nginx-ingress
      ports:
        - protocol: TCP
          port: 8000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
```

## Backup and Disaster Recovery

### Database Backups

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="swiftprints_backup_$DATE.sql"

# Create backup
pg_dump $DATABASE_URL > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_DIR/$BACKUP_FILE.gz" s3://swiftprints-backups/

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

### File Storage Backups

```bash
# S3 cross-region replication
aws s3api put-bucket-replication \
  --bucket swiftprints-storage \
  --replication-configuration file://replication.json
```

### Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Backup frequency**: Every 6 hours
4. **Cross-region replication**: Enabled
5. **Automated failover**: Configured

## Performance Optimization

### Application Optimization

```python
# Async database operations
async def get_orders(user_id: str):
    async with async_session() as session:
        result = await session.execute(
            select(Order)
            .options(selectinload(Order.maker))
            .where(Order.customer_id == user_id)
        )
        return result.scalars().all()
```

### Database Optimization

```sql
-- Performance indexes
CREATE INDEX CONCURRENTLY idx_orders_customer_status
ON orders(customer_id, status);

CREATE INDEX CONCURRENTLY idx_makers_location
ON makers USING GIST(ST_Point(location_lng, location_lat));

-- Partitioning for large tables
CREATE TABLE orders_2024 PARTITION OF orders
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### Caching Optimization

```python
# Multi-level caching
@cache(ttl=3600, key_prefix="maker_search")
async def search_makers(location: str, radius: int):
    # Database query with caching
    pass

@cache(ttl=1800, key_prefix="pricing")
async def calculate_pricing(analysis_id: str, maker_id: str):
    # Pricing calculation with caching
    pass
```

## Cost Optimization

### Resource Right-sizing

```yaml
# Cost-optimized resource allocation
resources:
  requests:
    memory: "256Mi" # Start small
    cpu: "100m"
  limits:
    memory: "1Gi" # Allow bursting
    cpu: "500m"
```

### Auto-scaling Policies

```yaml
# Cost-aware scaling
behavior:
  scaleDown:
    stabilizationWindowSeconds: 300
    policies:
      - type: Percent
        value: 50
        periodSeconds: 60
  scaleUp:
    stabilizationWindowSeconds: 60
    policies:
      - type: Percent
        value: 100
        periodSeconds: 15
```

This deployment guide provides comprehensive coverage of deploying and scaling the Swift Prints backend across different environments and platforms, with emphasis on security, performance, and cost optimization.
