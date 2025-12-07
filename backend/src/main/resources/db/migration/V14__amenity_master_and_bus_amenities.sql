-- Drop the old incorrect amenities table
DROP TABLE IF EXISTS amenities;

-- Create reusable master amenity list
CREATE TABLE amenity_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  description VARCHAR(255)
);

-- Insert some common amenities (optional but useful)
INSERT INTO amenity_master (code, description) VALUES
 ('WIFI', 'Wireless Internet'),
 ('AC', 'Air Conditioned Bus'),
 ('CHARGER', 'Mobile Charging Point'),
 ('WATER', 'Free Water Bottle'),
 ('BLANKET', 'Travel Blanket');

-- Mapping table for Many-to-Many (Bus <--> Amenity)
CREATE TABLE bus_amenities (
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES amenity_master(id) ON DELETE CASCADE,
  PRIMARY KEY (bus_id, amenity_id)
);
