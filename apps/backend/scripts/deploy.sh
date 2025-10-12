#!/bin/bash

# Swift Prints Backend Deployment Script

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-development}
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

echo "🚀 Deploying Swift Prints Backend - Environment: $ENVIRONMENT"

# Function to check if required tools are installed
check_dependencies() {
    echo "📋 Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose is not installed"
        exit 1
    fi
    
    echo "✅ Dependencies check passed"
}

# Function to setup environment
setup_environment() {
    echo "🔧 Setting up environment..."
    
    # Select appropriate compose file
    case $ENVIRONMENT in
        "development")
            COMPOSE_FILE="docker-compose.dev.yml"
            ;;
        "staging")
            COMPOSE_FILE="docker-compose.staging.yml"
            ;;
        "production")
            COMPOSE_FILE="docker-compose.yml"
            ;;
        *)
            echo "❌ Unknown environment: $ENVIRONMENT"
            echo "Available environments: development, staging, production"
            exit 1
            ;;
    esac
    
    # Check if environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        echo "⚠️  Environment file $ENV_FILE not found"
        echo "📝 Creating from template..."
        cp .env.example $ENV_FILE
        echo "✏️  Please edit $ENV_FILE with your configuration"
        exit 1
    fi
    
    echo "✅ Environment setup complete"
}

# Function to run database migrations
run_migrations() {
    echo "🗄️  Running database migrations..."
    
    docker-compose -f $COMPOSE_FILE exec -T api alembic upgrade head
    
    echo "✅ Database migrations complete"
}

# Function to build and start services
deploy_services() {
    echo "🏗️  Building and starting services..."
    
    # Pull latest images
    docker-compose -f $COMPOSE_FILE pull
    
    # Build custom images
    docker-compose -f $COMPOSE_FILE build --no-cache
    
    # Start services
    docker-compose -f $COMPOSE_FILE up -d
    
    echo "✅ Services deployed"
}

# Function to wait for services to be healthy
wait_for_services() {
    echo "⏳ Waiting for services to be healthy..."
    
    # Wait for API to be ready
    timeout=60
    counter=0
    
    while [ $counter -lt $timeout ]; do
        if curl -f http://localhost:8000/health &> /dev/null; then
            echo "✅ API is healthy"
            break
        fi
        
        echo "⏳ Waiting for API... ($counter/$timeout)"
        sleep 2
        counter=$((counter + 2))
    done
    
    if [ $counter -ge $timeout ]; then
        echo "❌ API health check timeout"
        exit 1
    fi
}

# Function to run post-deployment tasks
post_deployment() {
    echo "🔄 Running post-deployment tasks..."
    
    # Create initial data if needed
    if [ "$ENVIRONMENT" = "development" ]; then
        echo "📊 Seeding development data..."
        docker-compose -f $COMPOSE_FILE exec -T api python scripts/seed_data.py
    fi
    
    # Clear caches
    echo "🧹 Clearing caches..."
    docker-compose -f $COMPOSE_FILE exec -T redis redis-cli FLUSHALL
    
    echo "✅ Post-deployment tasks complete"
}

# Function to show deployment status
show_status() {
    echo "📊 Deployment Status:"
    echo "===================="
    
    docker-compose -f $COMPOSE_FILE ps
    
    echo ""
    echo "🌐 Service URLs:"
    echo "API: http://localhost:8000"
    echo "API Docs: http://localhost:8000/docs"
    echo "Health Check: http://localhost:8000/health"
    
    if [ "$ENVIRONMENT" = "development" ]; then
        echo "Redis Commander: http://localhost:8081"
        echo "PgAdmin: http://localhost:5050"
    fi
    
    if docker-compose -f $COMPOSE_FILE ps | grep -q prometheus; then
        echo "Prometheus: http://localhost:9090"
        echo "Grafana: http://localhost:3000"
    fi
}

# Function to cleanup old resources
cleanup() {
    echo "🧹 Cleaning up old resources..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes (be careful in production)
    if [ "$ENVIRONMENT" = "development" ]; then
        docker volume prune -f
    fi
    
    echo "✅ Cleanup complete"
}

# Main deployment flow
main() {
    echo "🎯 Starting deployment process..."
    
    check_dependencies
    setup_environment
    
    # Stop existing services
    echo "🛑 Stopping existing services..."
    docker-compose -f $COMPOSE_FILE down
    
    deploy_services
    wait_for_services
    run_migrations
    post_deployment
    
    cleanup
    show_status
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "Environment: $ENVIRONMENT"
    echo "Compose file: $COMPOSE_FILE"
}

# Handle script arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "Swift Prints Backend Deployment Script"
        echo ""
        echo "Usage: $0 [environment]"
        echo ""
        echo "Environments:"
        echo "  development  - Local development setup"
        echo "  staging      - Staging environment"
        echo "  production   - Production environment"
        echo ""
        echo "Examples:"
        echo "  $0 development"
        echo "  $0 production"
        exit 0
        ;;
    "status")
        setup_environment
        show_status
        exit 0
        ;;
    "logs")
        setup_environment
        docker-compose -f $COMPOSE_FILE logs -f
        exit 0
        ;;
    "stop")
        setup_environment
        echo "🛑 Stopping services..."
        docker-compose -f $COMPOSE_FILE down
        echo "✅ Services stopped"
        exit 0
        ;;
    *)
        main
        ;;
esac