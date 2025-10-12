#!/usr/bin/env python3
"""
Seed database with sample data for development.
"""
from app.models import User, UserRole, Maker, Printer, Material
from app.core.database import SessionLocal
import sys
import uuid
from pathlib import Path

# Add the app directory to the path
sys.path.append(str(Path(__file__).parent.parent))


def create_sample_data():
    """Create sample data for development."""
    db = SessionLocal()

    try:
        # Create sample users
        customer_user = User(
            id=uuid.uuid4(),
            email="customer@example.com",
            role=UserRole.CUSTOMER
        )

        maker_user = User(
            id=uuid.uuid4(),
            email="maker@example.com",
            role=UserRole.MAKER
        )

        db.add(customer_user)
        db.add(maker_user)
        db.flush()  # Get IDs

        # Create sample maker
        maker = Maker(
            user_id=maker_user.id,
            name="Balu's Print Lab",
            description="Professional 3D printing services with high-quality results",
            location_lat=12.9716,  # Bangalore coordinates
            location_lng=77.5946,
            location_address="Indiranagar, Bengaluru, Karnataka, India",
            rating=4.9,
            total_prints=342,
            verified=True,
            available=True
        )

        db.add(maker)
        db.flush()

        # Create sample printer
        printer = Printer(
            maker_id=maker.id,
            name="Prusa i3 MK3S+",
            model="Original Prusa i3 MK3S+",
            build_volume_x=250,
            build_volume_y=210,
            build_volume_z=210,
            hourly_rate=180.00,
            active=True
        )

        db.add(printer)
        db.flush()

        # Create sample materials
        materials = [
            Material(
                printer_id=printer.id,
                type="PLA",
                brand="Prusament",
                color_name="Matte Black",
                color_hex="#1a1a1a",
                price_per_gram=2.50,
                stock_grams=1000,
                available=True
            ),
            Material(
                printer_id=printer.id,
                type="PLA",
                brand="Prusament",
                color_name="Galaxy Silver",
                color_hex="#c0c0c0",
                price_per_gram=2.50,
                stock_grams=800,
                available=True
            ),
            Material(
                printer_id=printer.id,
                type="PETG",
                brand="Prusament",
                color_name="Transparent",
                color_hex="#ffffff",
                price_per_gram=3.20,
                stock_grams=500,
                available=True
            ),
            Material(
                printer_id=printer.id,
                type="ABS",
                brand="Prusament",
                color_name="Jet Black",
                color_hex="#000000",
                price_per_gram=2.80,
                stock_grams=600,
                available=True
            )
        ]

        for material in materials:
            db.add(material)

        # Commit all changes
        db.commit()
        print("Sample data created successfully!")
        print(f"Customer user: {customer_user.email}")
        print(f"Maker user: {maker_user.email}")
        print(f"Maker: {maker.name}")
        print(f"Printer: {printer.name}")
        print(f"Materials: {len(materials)} materials added")

    except Exception as e:
        db.rollback()
        print(f"Error creating sample data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_sample_data()
