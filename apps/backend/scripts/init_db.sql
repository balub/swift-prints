-- Swift Prints Database Initialization Script

-- Create database if it doesn't exist (PostgreSQL)
-- This script is run during Docker container initialization

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better performance
-- These will be created by Alembic migrations, but included here for reference

-- Users table indexes
-- CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Makers table indexes
-- CREATE INDEX IF NOT EXISTS idx_makers_location ON makers USING GIST (ll_to_earth(location_lat, location_lng));
-- CREATE INDEX IF NOT EXISTS idx_makers_available ON makers(available);
-- CREATE INDEX IF NOT EXISTS idx_makers_verified ON makers(verified);
-- CREATE INDEX IF NOT EXISTS idx_makers_rating ON makers(rating);

-- Files table indexes
-- CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
-- CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);

-- Orders table indexes
-- CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
-- CREATE INDEX IF NOT EXISTS idx_orders_maker_id ON orders(maker_id);
-- CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
-- CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Analysis results table indexes
-- CREATE INDEX IF NOT EXISTS idx_analysis_file_id ON analysis_results(file_id);
-- CREATE INDEX IF NOT EXISTS idx_analysis_created_at ON analysis_results(created_at);

-- Materials table indexes
-- CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);
-- CREATE INDEX IF NOT EXISTS idx_materials_available ON materials(available);

-- Create a function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Note: Triggers will be created by Alembic migrations
-- This is just for reference

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO swiftprints;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO swiftprints;

-- Insert initial data (optional)
-- This could include default material types, system settings, etc.

-- Example: Insert default material types
-- INSERT INTO material_types (name, description) VALUES 
-- ('PLA', 'Polylactic Acid - Easy to print, biodegradable'),
-- ('ABS', 'Acrylonitrile Butadiene Styrene - Strong and durable'),
-- ('PETG', 'Polyethylene Terephthalate Glycol - Chemical resistant'),
-- ('TPU', 'Thermoplastic Polyurethane - Flexible material')
-- ON CONFLICT DO NOTHING;

-- Log initialization
INSERT INTO pg_stat_statements_info (dealloc) VALUES (0) ON CONFLICT DO NOTHING;