"""
Tests for maker management system.
"""
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.maker import Maker
from app.models.printer import Printer
from app.models.material import Material
from app.services.maker_service import MakerService
from app.schemas.maker import MakerCreate, PrinterCreate, MaterialCreate


class TestMakerService:
    """Test maker service functionality."""

    def test_create_maker_profile(self, db_session: Session):
        """Test creating a maker profile."""
        # Create a user with maker role
        user = User(
            id="550e8400-e29b-41d4-a716-446655440000",
            email="maker@example.com",
            role=UserRole.MAKER
        )
        db_session.add(user)
        db_session.commit()

        # Create maker service
        maker_service = MakerService(db_session)

        # Create maker profile
        maker_data = MakerCreate(
            name="Test Maker",
            description="A test maker",
            location_lat=40.7128,
            location_lng=-74.0060,
            location_address="New York, NY"
        )

        maker = maker_service.create_maker_profile(str(user.id), maker_data)

        assert maker.name == "Test Maker"
        assert maker.user_id == user.id
        assert maker.location_lat == Decimal("40.7128")
        assert maker.verified is False
        assert maker.available is True

    def test_create_maker_profile_user_not_found(self, db_session: Session):
        """Test creating maker profile with non-existent user."""
        maker_service = MakerService(db_session)
        maker_data = MakerCreate(name="Test Maker")

        with pytest.raises(Exception) as exc_info:
            maker_service.create_maker_profile("non-existent-id", maker_data)

        assert "User not found" in str(exc_info.value)

    def test_create_maker_profile_wrong_role(self, db_session: Session):
        """Test creating maker profile with customer role."""
        # Create a user with customer role
        user = User(
            id="550e8400-e29b-41d4-a716-446655440001",
            email="customer@example.com",
            role=UserRole.CUSTOMER
        )
        db_session.add(user)
        db_session.commit()

        maker_service = MakerService(db_session)
        maker_data = MakerCreate(name="Test Maker")

        with pytest.raises(Exception) as exc_info:
            maker_service.create_maker_profile(str(user.id), maker_data)

        assert "maker role" in str(exc_info.value)

    def test_add_printer(self, db_session: Session):
        """Test adding a printer to a maker."""
        # Create user and maker
        user = User(
            id="550e8400-e29b-41d4-a716-446655440002",
            email="maker2@example.com",
            role=UserRole.MAKER
        )
        db_session.add(user)
        db_session.commit()

        maker = Maker(
            user_id=user.id,
            name="Test Maker 2"
        )
        db_session.add(maker)
        db_session.commit()

        # Add printer
        maker_service = MakerService(db_session)
        printer_data = PrinterCreate(
            name="Prusa i3 MK3S+",
            model="Prusa i3 MK3S+",
            build_volume_x=250,
            build_volume_y=210,
            build_volume_z=210,
            hourly_rate=Decimal("15.00")
        )

        printer = maker_service.add_printer(
            str(maker.id), str(user.id), printer_data)

        assert printer.name == "Prusa i3 MK3S+"
        assert printer.maker_id == maker.id
        assert printer.build_volume_mm3 == 250 * 210 * 210

    def test_add_material(self, db_session: Session):
        """Test adding a material to a printer."""
        # Create user, maker, and printer
        user = User(
            id="550e8400-e29b-41d4-a716-446655440003",
            email="maker3@example.com",
            role=UserRole.MAKER
        )
        db_session.add(user)
        db_session.commit()

        maker = Maker(
            user_id=user.id,
            name="Test Maker 3"
        )
        db_session.add(maker)
        db_session.commit()

        printer = Printer(
            maker_id=maker.id,
            name="Test Printer"
        )
        db_session.add(printer)
        db_session.commit()

        # Add material
        maker_service = MakerService(db_session)
        material_data = MaterialCreate(
            type="PLA",
            brand="Prusament",
            color_name="Galaxy Black",
            color_hex="#1a1a1a",
            price_per_gram=Decimal("0.025"),
            stock_grams=1000
        )

        material = maker_service.add_material(
            str(printer.id), str(user.id), material_data)

        assert material.type == "PLA"
        assert material.printer_id == printer.id
        assert material.is_in_stock is True

    def test_search_makers_by_location(self, db_session: Session):
        """Test searching makers by location."""
        # Create multiple makers with different locations
        user1 = User(id="550e8400-e29b-41d4-a716-446655440004",
                     email="maker4@example.com", role=UserRole.MAKER)
        user2 = User(id="550e8400-e29b-41d4-a716-446655440005",
                     email="maker5@example.com", role=UserRole.MAKER)
        db_session.add_all([user1, user2])
        db_session.commit()

        maker1 = Maker(
            user_id=user1.id,
            name="NYC Maker",
            location_lat=40.7128,
            location_lng=-74.0060,
            available=True
        )
        maker2 = Maker(
            user_id=user2.id,
            name="LA Maker",
            location_lat=34.0522,
            location_lng=-118.2437,
            available=True
        )
        db_session.add_all([maker1, maker2])
        db_session.commit()

        # Search near NYC
        from app.schemas.maker import MakerSearchFilters
        maker_service = MakerService(db_session)
        filters = MakerSearchFilters(
            location_lat=40.7128,
            location_lng=-74.0060,
            radius_km=50,
            available_only=True
        )

        makers, total_count = maker_service.search_makers(filters)

        # Should find the NYC maker
        assert len(makers) >= 1
        assert any(maker.name == "NYC Maker" for maker in makers)

    def test_get_maker_capacity(self, db_session: Session):
        """Test getting maker capacity information."""
        # Create user, maker, printer, and material
        user = User(
            id="550e8400-e29b-41d4-a716-446655440006",
            email="maker6@example.com",
            role=UserRole.MAKER
        )
        db_session.add(user)
        db_session.commit()

        maker = Maker(
            user_id=user.id,
            name="Capacity Test Maker"
        )
        db_session.add(maker)
        db_session.commit()

        printer = Printer(
            maker_id=maker.id,
            name="Active Printer",
            active=True
        )
        db_session.add(printer)
        db_session.commit()

        material = Material(
            printer_id=printer.id,
            type="PLA",
            price_per_gram=Decimal("0.025"),
            stock_grams=500,
            available=True
        )
        db_session.add(material)
        db_session.commit()

        # Get capacity
        maker_service = MakerService(db_session)
        capacity = maker_service.get_maker_capacity(str(maker.id))

        assert capacity.total_printers == 1
        assert capacity.active_printers == 1
        assert capacity.total_materials == 1
        assert capacity.available_materials == 1
        assert capacity.estimated_capacity in ["low", "medium", "high"]


class TestMakerAPI:
    """Test maker API endpoints."""

    def test_create_maker_profile_endpoint(self, client: TestClient, auth_headers):
        """Test creating maker profile via API."""
        maker_data = {
            "name": "API Test Maker",
            "description": "Created via API",
            "location_lat": 40.7128,
            "location_lng": -74.0060,
            "location_address": "New York, NY"
        }

        response = client.post(
            "/api/makers/", json=maker_data, headers=auth_headers)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "API Test Maker"
        assert data["verified"] is False

    def test_search_makers_endpoint(self, client: TestClient):
        """Test searching makers via API."""
        response = client.get(
            "/api/makers/search?available_only=true&limit=10")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_maker_capacity_endpoint(self, client: TestClient, db_session: Session):
        """Test getting maker capacity via API."""
        # Create a maker first
        user = User(
            id="550e8400-e29b-41d4-a716-446655440007",
            email="capacity@example.com",
            role=UserRole.MAKER
        )
        db_session.add(user)
        db_session.commit()

        maker = Maker(
            user_id=user.id,
            name="Capacity API Maker"
        )
        db_session.add(maker)
        db_session.commit()

        response = client.get(f"/api/makers/{maker.id}/capacity")

        assert response.status_code == 200
        data = response.json()
        assert "total_printers" in data
        assert "estimated_capacity" in data

    def test_add_printer_endpoint(self, client: TestClient, auth_headers, db_session: Session):
        """Test adding printer via API."""
        # Create a maker first
        user = User(
            id="550e8400-e29b-41d4-a716-446655440008",
            email="printer@example.com",
            role=UserRole.MAKER
        )
        db_session.add(user)
        db_session.commit()

        maker = Maker(
            user_id=user.id,
            name="Printer API Maker"
        )
        db_session.add(maker)
        db_session.commit()

        printer_data = {
            "name": "API Test Printer",
            "model": "Test Model",
            "build_volume_x": 200,
            "build_volume_y": 200,
            "build_volume_z": 200,
            "hourly_rate": 10.00
        }

        response = client.post(
            f"/api/makers/{maker.id}/printers",
            json=printer_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "API Test Printer"
        assert data["maker_id"] == str(maker.id)
