-- Routes: logical routes between cities
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL, -- e.g. "Hyderabad - Bangalore Express"
  origin VARCHAR(150) NOT NULL,
  destination VARCHAR(150) NOT NULL,
  distance_km NUMERIC(8,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Route segments (for multi-leg routes)
CREATE TABLE route_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  seq INT NOT NULL,                 -- order of segment
  from_stop VARCHAR(150) NOT NULL,
  to_stop VARCHAR(150) NOT NULL,
  distance_km NUMERIC(8,2),
  duration_minutes INT
);
