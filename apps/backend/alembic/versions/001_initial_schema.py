"""Initial database schema

Revision ID: 001
Revises: 
Create Date: 2024-12-10 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table('users',
                    sa.Column('id', postgresql.UUID(
                        as_uuid=True), nullable=False),
                    sa.Column('email', sa.String(length=255), nullable=False),
                    sa.Column('role', sa.Enum('customer', 'maker',
                                              'admin', name='userrole'), nullable=False),
                    sa.Column('created_at', sa.DateTime(), nullable=False),
                    sa.Column('updated_at', sa.DateTime(), nullable=False),
                    sa.PrimaryKeyConstraint('id')
                    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Create makers table
    op.create_table('makers',
                    sa.Column('id', postgresql.UUID(
                        as_uuid=True), nullable=False),
                    sa.Column('user_id', postgresql.UUID(
                        as_uuid=True), nullable=False),
                    sa.Column('name', sa.String(length=255), nullable=False),
                    sa.Column('description', sa.Text(), nullable=True),
                    sa.Column('location_lat', sa.Numeric(
                        precision=10, scale=8), nullable=True),
                    sa.Column('location_lng', sa.Numeric(
                        precision=11, scale=8), nullable=True),
                    sa.Column('location_address', sa.Text(), nullable=True),
                    sa.Column('rating', sa.Numeric(
                        precision=3, scale=2), nullable=True),
                    sa.Column('total_prints', sa.Integer(), nullable=True),
                    sa.Column('verified', sa.Boolean(), nullable=True),
                    sa.Column('available', sa.Boolean(), nullable=True),
                    sa.Column('created_at', sa.DateTime(), nullable=False),
                    sa.Column('updated_at', sa.DateTime(), nullable=False),
                    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
                    sa.PrimaryKeyConstraint('id'),
                    sa.UniqueConstraint('user_id')
                    )

    # Create printers table
    op.create_table('printers',
                    sa.Column('id', postgresql.UUID(
                        as_uuid=True), nullable=False),
                    sa.Column('maker_id', postgresql.UUID(
                        as_uuid=True), nullable=False),
                    sa.Column('name', sa.String(length=255), nullable=False),
                    sa.Column('model', sa.String(length=255), nullable=True),
                    sa.Column('build_volume_x', sa.Integer(), nullable=True),
                    sa.Column('build_volume_y', sa.Integer(), nullable=True),
                    sa.Column('build_volume_z', sa.Integer(), nullable=True),
                    sa.Column('hourly_rate', sa.Numeric(
                        precision=10, scale=2), nullable=True),
                    sa.Column('active', sa.Boolean(), nullable=True),
                    sa.Column('created_at', sa.DateTime(), nullable=False),
                    sa.Column('updated_at', sa.DateTime(), nullable=False),
                    sa.ForeignKeyConstraint(['maker_id'], ['makers.id'], ),
                    sa.PrimaryKeyConstraint('id')
                    )

    # Create materials table
    op.create_table('materials',
                    sa.Column('id', postgresql.UUID(
                        as_uuid=True), nullable=False),
                    sa.Column('printer_id', postgresql.UUID(
                        as_uuid=True), nullable=False),
                    sa.Column('type', sa.String(length=50), nullable=False),
                    sa.Column('brand', sa.String(length=100), nullable=True),
                    sa.Column('color_name', sa.String(
                        length=100), nullable=True),
                    sa.Column('color_hex', sa.String(length=7), nullable=True),
                    sa.Column('price_per_gram', sa.Numeric(
                        precision=8, scale=4), nullable=False),
                    sa.Column('stock_grams', sa.Integer(), nullable=True),
                    sa.Column('available', sa.Boolean(), nullable=True),
                    sa.Column('created_at', sa.DateTime(), nullable=False),
                    sa.Column('updated_at', sa.DateTime(), nullable=False),
                    sa.ForeignKeyConstraint(['printer_id'], ['printers.id'], ),
                    sa.PrimaryKeyConstraint('id')
                    )

    # Create files table
    op.create_table('files',
                    sa.Column('id', postgresql.UUID(
                        as_uuid=True), nullable=False),
                    sa.Column('user_id', postgresql.UUID(
                        as_uuid=True), nullable=False),
                    sa.Column('filename', sa.String(
                        length=255), nullable=False),
                    sa.Column('original_filename', sa.String(
                        length=255), nullable=False),
                    sa.Column('file_size', sa.BigInteger(), nullable=True),
                    sa.Column('storage_path', sa.String(
                        length=500), nullable=True),
                    sa.Column('storage_backend', sa.String(
                        length=20), nullable=True),
                    sa.Column('created_at', sa.DateTime(), nullable=False),
                    sa.Column('updated_at', sa.DateTime(), nullable=False),
                    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
                    sa.PrimaryKeyConstraint('id')
                    )

    # Create analysis_results table
    op.create_table('analysis_results',
                    sa.Column('id', postgresql.UUID(
                        as_uuid=True), nullable=False),
                    sa.Column('file_id', postgresql.UUID(
                        as_uuid=True), nullable=False),
                    sa.Column('settings', postgresql.JSONB(
                        astext_type=sa.Text()), nullable=True),
                    sa.Column('filament_grams', sa.Numeric(
                        precision=8, scale=2), nullable=True),
                    sa.Column('print_time_hours', sa.Numeric(
                        precision=8, scale=2), nullable=True),
                    sa.Column('volume_mm3', sa.Numeric(
                        precision=12, scale=2), nullable=True),
                    sa.Column('complexity_score', sa.Numeric(
                        precision=4, scale=2), nullable=True),
                    sa.Column('supports_required',
                              sa.Boolean(), nullable=True),
                    sa.Column('created_at', sa.DateTime(), nullable=False),
                    sa.Column('updated_at', sa.DateTime(), nullable=False),
                    sa.ForeignKeyConstraint(['file_id'], ['files.id'], ),
                    sa.PrimaryKeyConstraint('id')
                    )

    # Create orders table
    op.create_table('orders',
                    sa.Column('id', postgresql.UUID(
                        as_uuid=True), nullable=False),
                    sa.Column('customer_id', postgresql.UUID(
                        as_uuid=True), nullable=False),
                    sa.Column('maker_id', postgresql.UUID(
                        as_uuid=True), nullable=True),
                    sa.Column('file_id', postgresql.UUID(
                        as_uuid=True), nullable=False),
                    sa.Column('analysis_id', postgresql.UUID(
                        as_uuid=True), nullable=True),
                    sa.Column('settings', postgresql.JSONB(
                        astext_type=sa.Text()), nullable=True),
                    sa.Column('pricing', postgresql.JSONB(
                        astext_type=sa.Text()), nullable=True),
                    sa.Column('status', sa.Enum('pending', 'confirmed', 'in_progress',
                                                'completed', 'cancelled', 'disputed', name='orderstatus'), nullable=False),
                    sa.Column('delivery_address', sa.Text(), nullable=True),
                    sa.Column('special_instructions',
                              sa.Text(), nullable=True),
                    sa.Column('created_at', sa.DateTime(), nullable=False),
                    sa.Column('updated_at', sa.DateTime(), nullable=False),
                    sa.ForeignKeyConstraint(
                        ['analysis_id'], ['analysis_results.id'], ),
                    sa.ForeignKeyConstraint(['customer_id'], ['users.id'], ),
                    sa.ForeignKeyConstraint(['file_id'], ['files.id'], ),
                    sa.ForeignKeyConstraint(['maker_id'], ['makers.id'], ),
                    sa.PrimaryKeyConstraint('id')
                    )

    # Create indexes for performance
    op.create_index('ix_makers_location', 'makers', [
                    'location_lat', 'location_lng'])
    op.create_index('ix_makers_available', 'makers', ['available'])
    op.create_index('ix_makers_verified', 'makers', ['verified'])
    op.create_index('ix_orders_status', 'orders', ['status'])
    op.create_index('ix_orders_customer', 'orders', ['customer_id'])
    op.create_index('ix_orders_maker', 'orders', ['maker_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_orders_maker', table_name='orders')
    op.drop_index('ix_orders_customer', table_name='orders')
    op.drop_index('ix_orders_status', table_name='orders')
    op.drop_index('ix_makers_verified', table_name='makers')
    op.drop_index('ix_makers_available', table_name='makers')
    op.drop_index('ix_makers_location', table_name='makers')

    # Drop tables
    op.drop_table('orders')
    op.drop_table('analysis_results')
    op.drop_table('files')
    op.drop_table('materials')
    op.drop_table('printers')
    op.drop_table('makers')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS orderstatus')
    op.execute('DROP TYPE IF EXISTS userrole')
