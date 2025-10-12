# Testing Guide

## Overview

This guide covers the comprehensive testing strategy for the Swift Prints backend, including unit tests, integration tests, end-to-end tests, and performance testing.

## Testing Philosophy

Our testing approach follows the testing pyramid:

```
    /\
   /  \     E2E Tests (Few)
  /____\
 /      \   Integration Tests (Some)
/__________\ Unit Tests (Many)
```

- **Unit Tests (70%)**: Fast, isolated tests for individual components
- **Integration Tests (20%)**: Test component interactions
- **End-to-End Tests (10%)**: Full workflow testing

## Test Structure

### Directory Organization

```
tests/
├── unit/                   # Unit tests
│   ├── test_auth.py
│   ├── test_models.py
│   ├── test_services/
│   │   ├── test_upload_service.py
│   │   ├── test_analysis_service.py
│   │   └── test_pricing_service.py
│   └── test_utils/
├── integration/            # Integration tests
│   ├── test_api_endpoints.py
│   ├── test_database.py
│   └── test_external_services.py
├── e2e/                   # End-to-end tests
│   ├── test_user_workflows.py
│   └── test_order_lifecycle.py
├── performance/           # Performance tests
│   ├── test_load.py
│   └── test_stress.py
├── fixtures/              # Test data and fixtures
│   ├── sample_files/
│   └── test_data.py
└── conftest.py           # Pytest configuration
```

## Test Configuration

### pytest Configuration

```python
# conftest.py
import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import get_db, Base
from app.core.config import settings

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def db_session():
    """Create a fresh database session for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def override_get_db(db_session):
    """Override the get_db dependency."""
    def _override_get_db():
        try:
            yield db_session
        finally:
            db_session.close()

    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.clear()

@pytest.fixture
async def client(override_get_db):
    """Create an async HTTP client for testing."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def sample_user():
    """Create a sample user for testing."""
    return {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "email": "test@example.com",
        "role": "customer"
    }

@pytest.fixture
def sample_maker():
    """Create a sample maker for testing."""
    return {
        "id": "maker_123",
        "name": "Test Maker",
        "location_lat": 40.7128,
        "location_lng": -74.0060,
        "rating": 4.5,
        "verified": True
    }

@pytest.fixture
def sample_stl_file():
    """Provide path to sample STL file."""
    return "tests/fixtures/sample_files/test_cube.stl"
```

### Test Environment Configuration

```python
# tests/test_config.py
import os
from app.core.config import Settings

def get_test_settings():
    """Override settings for testing."""
    return Settings(
        environment="testing",
        database_url="sqlite:///./test.db",
        redis_url="redis://localhost:6379/15",  # Use different Redis DB
        storage_backend="local",
        storage_path="./test_storage",
        supabase_url="http://localhost:54321",  # Local Supabase
        supabase_key="test-key",
        secret_key="test-secret-key",
        log_level="debug"
    )
```

## Unit Tests

### Model Testing

```python
# tests/unit/test_models.py
import pytest
from app.models.user import User
from app.models.maker import Maker
from app.models.order import Order

class TestUserModel:
    def test_user_creation(self, db_session):
        """Test user model creation."""
        user = User(
            id="test-user-id",
            email="test@example.com",
            role="customer"
        )
        db_session.add(user)
        db_session.commit()

        assert user.id == "test-user-id"
        assert user.email == "test@example.com"
        assert user.role == "customer"
        assert user.created_at is not None

    def test_user_validation(self):
        """Test user model validation."""
        with pytest.raises(ValueError):
            User(email="invalid-email", role="customer")

        with pytest.raises(ValueError):
            User(email="test@example.com", role="invalid-role")

class TestMakerModel:
    def test_maker_creation(self, db_session, sample_user):
        """Test maker model creation."""
        user = User(**sample_user)
        db_session.add(user)
        db_session.commit()

        maker = Maker(
            user_id=user.id,
            name="Test Maker",
            location_lat=40.7128,
            location_lng=-74.0060
        )
        db_session.add(maker)
        db_session.commit()

        assert maker.name == "Test Maker"
        assert maker.location_lat == 40.7128
        assert maker.rating == 0.0  # Default rating
        assert maker.verified is False  # Default verification

    def test_maker_location_validation(self):
        """Test maker location validation."""
        with pytest.raises(ValueError):
            Maker(
                name="Test Maker",
                location_lat=91.0,  # Invalid latitude
                location_lng=0.0
            )
```

### Service Testing

```python
# tests/unit/test_services/test_upload_service.py
import pytest
from unittest.mock import Mock, patch, AsyncMock
from app.services.upload_service import UploadService
from app.services.storage.local import LocalStorage

class TestUploadService:
    @pytest.fixture
    def upload_service(self):
        """Create upload service with mocked storage."""
        storage = Mock(spec=LocalStorage)
        return UploadService(storage=storage)

    @pytest.mark.asyncio
    async def test_initiate_upload(self, upload_service):
        """Test upload initiation."""
        upload_service.storage.generate_upload_url.return_value = "http://test-url"

        result = await upload_service.initiate_upload(
            filename="test.stl",
            size=1024,
            user_id="user-123"
        )

        assert result["filename"] == "test.stl"
        assert result["size"] == 1024
        assert "session_id" in result
        assert "upload_url" in result

    @pytest.mark.asyncio
    async def test_complete_upload(self, upload_service, db_session):
        """Test upload completion."""
        session_id = "test-session-123"

        # Mock storage verification
        upload_service.storage.verify_upload.return_value = True
        upload_service.storage.get_file_info.return_value = {
            "size": 1024,
            "content_type": "application/octet-stream"
        }

        result = await upload_service.complete_upload(session_id, db_session)

        assert result["status"] == "completed"
        assert "file_id" in result

    @pytest.mark.asyncio
    async def test_upload_validation_failure(self, upload_service):
        """Test upload validation failure."""
        with pytest.raises(ValueError, match="File too large"):
            await upload_service.initiate_upload(
                filename="large.stl",
                size=100 * 1024 * 1024,  # 100MB
                user_id="user-123"
            )
```

### API Endpoint Testing

```python
# tests/unit/test_api/test_auth.py
import pytest
from unittest.mock import patch, AsyncMock

class TestAuthAPI:
    @pytest.mark.asyncio
    async def test_verify_token_success(self, client):
        """Test successful token verification."""
        with patch('app.services.auth_service.AuthService.verify_token') as mock_verify:
            mock_verify.return_value = {
                "id": "user-123",
                "email": "test@example.com",
                "role": "customer"
            }

            response = await client.post(
                "/auth/verify",
                json={"token": "valid-jwt-token"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["valid"] is True
            assert data["user"]["email"] == "test@example.com"

    @pytest.mark.asyncio
    async def test_verify_token_invalid(self, client):
        """Test invalid token verification."""
        with patch('app.services.auth_service.AuthService.verify_token') as mock_verify:
            mock_verify.side_effect = ValueError("Invalid token")

            response = await client.post(
                "/auth/verify",
                json={"token": "invalid-token"}
            )

            assert response.status_code == 401
            data = response.json()
            assert data["error"] == "invalid_token"

    @pytest.mark.asyncio
    async def test_get_current_user(self, client, sample_user):
        """Test get current user endpoint."""
        with patch('app.core.auth_middleware.get_current_user') as mock_user:
            mock_user.return_value = sample_user

            response = await client.get(
                "/auth/me",
                headers={"Authorization": "Bearer valid-token"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["email"] == sample_user["email"]
```

## Integration Tests

### Database Integration

```python
# tests/integration/test_database.py
import pytest
from app.models.user import User
from app.models.maker import Maker
from app.models.order import Order
from app.services.maker_service import MakerService

class TestDatabaseIntegration:
    @pytest.mark.asyncio
    async def test_user_maker_relationship(self, db_session):
        """Test user-maker relationship."""
        # Create user
        user = User(
            id="user-123",
            email="maker@example.com",
            role="maker"
        )
        db_session.add(user)
        db_session.commit()

        # Create maker
        maker = Maker(
            user_id=user.id,
            name="Test Maker",
            location_lat=40.7128,
            location_lng=-74.0060
        )
        db_session.add(maker)
        db_session.commit()

        # Test relationship
        assert user.maker is not None
        assert user.maker.name == "Test Maker"
        assert maker.user.email == "maker@example.com"

    @pytest.mark.asyncio
    async def test_order_lifecycle(self, db_session):
        """Test complete order lifecycle."""
        # Create customer
        customer = User(id="customer-123", email="customer@example.com", role="customer")
        db_session.add(customer)

        # Create maker
        maker_user = User(id="maker-123", email="maker@example.com", role="maker")
        db_session.add(maker_user)

        maker = Maker(user_id=maker_user.id, name="Test Maker")
        db_session.add(maker)

        db_session.commit()

        # Create order
        order = Order(
            customer_id=customer.id,
            maker_id=maker.id,
            status="pending",
            pricing={"total": 50.00}
        )
        db_session.add(order)
        db_session.commit()

        # Test order relationships
        assert order.customer.email == "customer@example.com"
        assert order.maker.name == "Test Maker"
        assert order.status == "pending"
```

### External Service Integration

```python
# tests/integration/test_external_services.py
import pytest
from unittest.mock import patch, Mock
from app.services.slicer.prusa_runner import PrusaSlicerRunner

class TestExternalServiceIntegration:
    @pytest.mark.asyncio
    async def test_prusaslicer_integration(self, sample_stl_file):
        """Test PrusaSlicer integration."""
        runner = PrusaSlicerRunner()

        # Mock Docker client
        with patch('docker.from_env') as mock_docker:
            mock_container = Mock()
            mock_container.wait.return_value = {"StatusCode": 0}
            mock_container.logs.return_value = b"Slicing completed successfully"

            mock_docker.return_value.containers.run.return_value = mock_container

            result = await runner.slice_file(
                stl_path=sample_stl_file,
                config={
                    "layer_height": 0.2,
                    "infill_density": 20,
                    "material": "PLA"
                }
            )

            assert result["success"] is True
            assert "gcode_path" in result

    @pytest.mark.asyncio
    async def test_supabase_auth_integration(self):
        """Test Supabase authentication integration."""
        from app.services.auth_service import AuthService

        auth_service = AuthService()

        # Test with mock JWT token
        with patch('jwt.decode') as mock_decode:
            mock_decode.return_value = {
                "sub": "user-123",
                "email": "test@example.com",
                "role": "customer",
                "exp": 9999999999  # Far future
            }

            user = await auth_service.verify_token("mock-jwt-token")

            assert user["id"] == "user-123"
            assert user["email"] == "test@example.com"
            assert user["role"] == "customer"
```

## End-to-End Tests

### Complete User Workflows

```python
# tests/e2e/test_user_workflows.py
import pytest
import asyncio
from httpx import AsyncClient

class TestCustomerWorkflow:
    @pytest.mark.asyncio
    async def test_complete_order_workflow(self, client, sample_stl_file):
        """Test complete customer order workflow."""
        # Step 1: Upload file
        with open(sample_stl_file, 'rb') as f:
            file_content = f.read()

        # Initiate upload
        upload_response = await client.post(
            "/api/upload/initiate",
            json={
                "filename": "test_cube.stl",
                "size": len(file_content),
                "content_type": "application/octet-stream"
            },
            headers={"Authorization": "Bearer customer-token"}
        )
        assert upload_response.status_code == 200
        upload_data = upload_response.json()

        # Complete upload (mocked)
        complete_response = await client.post(
            "/api/upload/complete",
            json={"session_id": upload_data["session_id"]},
            headers={"Authorization": "Bearer customer-token"}
        )
        assert complete_response.status_code == 200
        file_data = complete_response.json()

        # Step 2: Analyze file
        analysis_response = await client.post(
            "/api/analyze",
            json={
                "file_id": file_data["file_id"],
                "settings": {
                    "layer_height": 0.2,
                    "infill_density": 20,
                    "material_type": "PLA"
                }
            },
            headers={"Authorization": "Bearer customer-token"}
        )
        assert analysis_response.status_code == 200
        analysis_data = analysis_response.json()

        # Wait for analysis completion (mocked)
        await asyncio.sleep(0.1)  # Simulate processing time

        # Step 3: Get analysis results
        result_response = await client.get(
            f"/api/analyze/{analysis_data['job_id']}/result",
            headers={"Authorization": "Bearer customer-token"}
        )
        assert result_response.status_code == 200
        result_data = result_response.json()

        # Step 4: Search makers
        makers_response = await client.get(
            "/api/makers?location=40.7128,-74.0060&radius=50",
            headers={"Authorization": "Bearer customer-token"}
        )
        assert makers_response.status_code == 200
        makers_data = makers_response.json()
        assert len(makers_data["makers"]) > 0

        # Step 5: Calculate pricing
        pricing_response = await client.post(
            "/api/pricing/calculate",
            json={
                "analysis_id": result_data["analysis_id"],
                "maker_id": makers_data["makers"][0]["id"],
                "settings": {"material_type": "PLA", "quantity": 1}
            },
            headers={"Authorization": "Bearer customer-token"}
        )
        assert pricing_response.status_code == 200
        pricing_data = pricing_response.json()

        # Step 6: Place order
        order_response = await client.post(
            "/api/orders",
            json={
                "file_id": file_data["file_id"],
                "analysis_id": result_data["analysis_id"],
                "maker_id": makers_data["makers"][0]["id"],
                "settings": {"material_type": "PLA", "quantity": 1},
                "delivery_address": "123 Test St, Test City, TS 12345"
            },
            headers={"Authorization": "Bearer customer-token"}
        )
        assert order_response.status_code == 201
        order_data = order_response.json()

        # Verify order was created
        assert order_data["status"] == "pending"
        assert "id" in order_data
        assert order_data["pricing"]["total"] > 0

class TestMakerWorkflow:
    @pytest.mark.asyncio
    async def test_maker_registration_workflow(self, client):
        """Test complete maker registration workflow."""
        # Step 1: Register as maker
        registration_response = await client.post(
            "/api/makers",
            json={
                "name": "Test Maker Shop",
                "description": "Professional 3D printing services",
                "location": {
                    "address": "456 Maker Ave, Maker City, MC 67890",
                    "latitude": 40.7589,
                    "longitude": -73.9851
                },
                "printers": [
                    {
                        "name": "Prusa i3 MK3S+",
                        "model": "Prusa i3 MK3S+",
                        "build_volume": {"x": 250, "y": 210, "z": 210},
                        "hourly_rate": 15.00
                    }
                ],
                "materials": [
                    {
                        "type": "PLA",
                        "brand": "Hatchbox",
                        "color_name": "Black",
                        "color_hex": "#000000",
                        "price_per_gram": 0.025,
                        "stock_grams": 1000
                    }
                ]
            },
            headers={"Authorization": "Bearer maker-token"}
        )
        assert registration_response.status_code == 201
        maker_data = registration_response.json()

        # Verify maker was created
        assert maker_data["name"] == "Test Maker Shop"
        assert maker_data["verified"] is False  # Starts unverified
        assert "id" in maker_data
```

## Performance Tests

### Load Testing

```python
# tests/performance/test_load.py
import pytest
import asyncio
import time
from httpx import AsyncClient
from concurrent.futures import ThreadPoolExecutor

class TestLoadPerformance:
    @pytest.mark.asyncio
    async def test_concurrent_api_requests(self, client):
        """Test API performance under concurrent load."""
        async def make_request():
            response = await client.get("/health")
            return response.status_code == 200

        # Test with 50 concurrent requests
        start_time = time.time()
        tasks = [make_request() for _ in range(50)]
        results = await asyncio.gather(*tasks)
        end_time = time.time()

        # All requests should succeed
        assert all(results)

        # Should complete within reasonable time (adjust based on requirements)
        duration = end_time - start_time
        assert duration < 5.0  # 5 seconds max

        # Calculate requests per second
        rps = len(tasks) / duration
        assert rps > 10  # At least 10 RPS

    @pytest.mark.asyncio
    async def test_file_upload_performance(self, client):
        """Test file upload performance."""
        # Create test file data
        file_size = 1024 * 1024  # 1MB
        test_data = b"0" * file_size

        start_time = time.time()

        # Initiate upload
        upload_response = await client.post(
            "/api/upload/initiate",
            json={
                "filename": "performance_test.stl",
                "size": file_size,
                "content_type": "application/octet-stream"
            },
            headers={"Authorization": "Bearer test-token"}
        )

        end_time = time.time()

        assert upload_response.status_code == 200

        # Upload initiation should be fast
        duration = end_time - start_time
        assert duration < 1.0  # Less than 1 second

class TestDatabasePerformance:
    @pytest.mark.asyncio
    async def test_maker_search_performance(self, db_session):
        """Test maker search performance with large dataset."""
        from app.services.maker_service import MakerService
        from app.models.maker import Maker

        # Create test makers
        makers = []
        for i in range(1000):
            maker = Maker(
                name=f"Maker {i}",
                location_lat=40.7128 + (i * 0.001),
                location_lng=-74.0060 + (i * 0.001),
                rating=4.0 + (i % 10) * 0.1
            )
            makers.append(maker)

        db_session.add_all(makers)
        db_session.commit()

        # Test search performance
        service = MakerService()

        start_time = time.time()
        results = await service.search_makers(
            location_lat=40.7128,
            location_lng=-74.0060,
            radius_km=50,
            db=db_session
        )
        end_time = time.time()

        # Should return results
        assert len(results) > 0

        # Should complete quickly even with 1000 makers
        duration = end_time - start_time
        assert duration < 0.5  # Less than 500ms
```

### Memory and Resource Testing

```python
# tests/performance/test_memory.py
import pytest
import psutil
import gc
from app.services.slicer.analysis_service import AnalysisService

class TestMemoryUsage:
    def test_file_processing_memory_usage(self, sample_stl_file):
        """Test memory usage during file processing."""
        process = psutil.Process()
        initial_memory = process.memory_info().rss

        # Process multiple files
        service = AnalysisService()
        for _ in range(10):
            # Mock file processing
            with open(sample_stl_file, 'rb') as f:
                content = f.read()
                # Simulate processing
                processed = content * 2  # Double the data
                del processed

        # Force garbage collection
        gc.collect()

        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory

        # Memory increase should be reasonable (less than 100MB)
        assert memory_increase < 100 * 1024 * 1024
```

## Test Data and Fixtures

### Sample Files

```python
# tests/fixtures/test_data.py
import os
import tempfile

def create_sample_stl():
    """Create a simple STL file for testing."""
    stl_content = """solid test_cube
  facet normal 0.0 0.0 1.0
    outer loop
      vertex 0.0 0.0 1.0
      vertex 1.0 0.0 1.0
      vertex 1.0 1.0 1.0
    endloop
  endfacet
  facet normal 0.0 0.0 1.0
    outer loop
      vertex 0.0 0.0 1.0
      vertex 1.0 1.0 1.0
      vertex 0.0 1.0 1.0
    endloop
  endfacet
endsolid test_cube"""

    with tempfile.NamedTemporaryFile(mode='w', suffix='.stl', delete=False) as f:
        f.write(stl_content)
        return f.name

def sample_analysis_result():
    """Sample analysis result data."""
    return {
        "filament_grams": 25.5,
        "print_time_hours": 3.5,
        "volume_mm3": 12500.0,
        "complexity_score": 2.3,
        "supports_required": False,
        "layer_count": 175
    }

def sample_pricing_breakdown():
    """Sample pricing breakdown data."""
    return {
        "material_cost": 0.64,
        "labor_cost": 52.50,
        "complexity_premium": 0.00,
        "platform_fee": 5.31,
        "total": 58.45
    }
```

## Running Tests

### Local Testing

```bash
# Run all tests
pytest

# Run specific test categories
pytest tests/unit/
pytest tests/integration/
pytest tests/e2e/

# Run with coverage
pytest --cov=app --cov-report=html

# Run performance tests
pytest tests/performance/ -v

# Run tests in parallel
pytest -n auto

# Run tests with specific markers
pytest -m "not slow"
pytest -m "integration"
```

### CI/CD Testing

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.10"

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov pytest-xdist

      - name: Run unit tests
        run: pytest tests/unit/ --cov=app --cov-report=xml

      - name: Run integration tests
        run: pytest tests/integration/
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379/15

      - name: Run E2E tests
        run: pytest tests/e2e/

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
```

### Test Reporting

```python
# pytest.ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    --strict-markers
    --strict-config
    --verbose
    --tb=short
    --cov=app
    --cov-report=term-missing
    --cov-report=html:htmlcov
    --cov-report=xml
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: marks tests as integration tests
    e2e: marks tests as end-to-end tests
    performance: marks tests as performance tests
```

## Best Practices

### Test Writing Guidelines

1. **Test Naming**: Use descriptive names that explain what is being tested
2. **Test Structure**: Follow Arrange-Act-Assert pattern
3. **Test Independence**: Each test should be independent and idempotent
4. **Mock External Dependencies**: Use mocks for external services
5. **Test Edge Cases**: Include boundary conditions and error cases

### Performance Considerations

1. **Fast Unit Tests**: Keep unit tests under 100ms each
2. **Parallel Execution**: Use pytest-xdist for parallel test execution
3. **Test Data**: Use minimal test data sets
4. **Database Cleanup**: Clean up test data after each test
5. **Resource Management**: Properly close connections and clean up resources

### Continuous Improvement

1. **Coverage Monitoring**: Maintain >80% test coverage
2. **Performance Benchmarks**: Track test execution time
3. **Flaky Test Detection**: Identify and fix unstable tests
4. **Test Maintenance**: Regularly update and refactor tests
5. **Documentation**: Keep test documentation up to date

This comprehensive testing guide ensures the Swift Prints backend maintains high quality and reliability through thorough automated testing at all levels.
