"""
Database utility functions for common operations.
"""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

from .database import SessionLocal


def execute_raw_sql(query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Execute raw SQL query and return results.

    Args:
        query: SQL query string
        params: Query parameters

    Returns:
        List of dictionaries with query results
    """
    db = SessionLocal()
    try:
        result = db.execute(text(query), params or {})
        return [dict(row) for row in result.fetchall()]
    finally:
        db.close()


def check_database_connection() -> bool:
    """
    Check if database connection is working.

    Returns:
        bool: True if connection is successful
    """
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception:
        return False


def get_table_info() -> Dict[str, Any]:
    """
    Get information about database tables.

    Returns:
        Dictionary with table information
    """
    try:
        # For SQLite
        tables_query = """
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
        """

        tables = execute_raw_sql(tables_query)

        table_info = {}
        for table in tables:
            table_name = table['name']

            # Get column information
            columns_query = f"PRAGMA table_info({table_name})"
            columns = execute_raw_sql(columns_query)

            # Get row count
            count_query = f"SELECT COUNT(*) as count FROM {table_name}"
            count_result = execute_raw_sql(count_query)
            row_count = count_result[0]['count'] if count_result else 0

            table_info[table_name] = {
                'columns': columns,
                'row_count': row_count
            }

        return table_info

    except Exception as e:
        return {'error': str(e)}


def reset_database():
    """
    Reset database by dropping and recreating all tables.
    WARNING: This will delete all data!
    """
    from .database import Base, engine

    print("WARNING: This will delete all data in the database!")
    confirm = input("Type 'yes' to continue: ")

    if confirm.lower() == 'yes':
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        print("Database reset successfully!")
    else:
        print("Database reset cancelled.")
