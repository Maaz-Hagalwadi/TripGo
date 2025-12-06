-- Drivers
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  phone VARCHAR(30),
  license_number VARCHAR(100),
  license_expiry DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Buses
CREATE TABLE buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  bus_code VARCHAR(100) UNIQUE,           -- internal code
  vehicle_number VARCHAR(50),             -- registration
  model VARCHAR(100),
  bus_type VARCHAR(50),                   -- "SLEEPER", "SEATER", "AC", etc.
  total_seats INT NOT NULL,
  amenities JSONB,                        -- JSON metadata for features
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bus to Driver mapping (assignment)
CREATE TABLE bus_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  assigned_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_to TIMESTAMP WITH TIME ZONE
);
