"""
Database configuration and session management.
"""
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool, QueuePool
from sqlalchemy.engine import Engine
from typing import Generator
import logging

from .config import settings

logger = logging.getLogger(__name__)

# Create database engine with optimized configuration
if settings.database_url.startswith("sqlite"):
    # SQLite configuration for development
    engine = create_engine(
        settings.database_url,
        connect_args={
            "check_same_thread": False,
            "timeout": 20,
            "isolation_level": None
        },
        poolclass=StaticPool,
        echo=settings.debug,
        pool_pre_ping=True,
        pool_recycle=300
    )

    # Enable WAL mode for SQLite for better concurrency
    @event.listens_for(Engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        if 'sqlite' in str(dbapi_connection):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA cache_size=10000")
            cursor.execute("PRAGMA temp_store=MEMORY")
            cursor.close()
else:
    # PostgreSQL configuration for production with connection pooling
    engine = create_engine(
        settings.database_url,
        echo=settings.debug,
        poolclass=QueuePool,
        pool_size=settings.db_pool_size,  # Number of connections to maintain
        # Additional connections beyond pool_size
        max_overflow=settings.db_max_overflow,
        pool_pre_ping=True,  # Validate connections before use
        pool_recycle=3600,  # Recycle connections after 1 hour
        # Timeout for getting connection from pool
        pool_timeout=settings.db_pool_timeout,
        connect_args={
            "connect_timeout": 10,
            "application_name": "swift_prints_backend"
        }
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.

    Yields:
        Session: SQLAlchemy database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all database tables."""
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """Drop all database tables."""
    Base.metadata.drop_all(bind=engine)
