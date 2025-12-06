-- When a route runs: schedule entries (specific departures)
CREATE TABLE route_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  bus_id UUID REFERENCES buses(id) ON DELETE SET NULL,
  departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
  arrival_time TIMESTAMP WITH TIME ZONE NOT NULL,
  frequency VARCHAR(50), -- "DAILY", "WEEKLY", or null if one-off
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Days when a route runs (for weekly patterns)
CREATE TABLE route_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  weekday INT NOT NULL, -- 1=Monday .. 7=Sunday
  start_date DATE,
  end_date DATE
);

-- fares: per route or per route_segment
CREATE TABLE fares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  route_segment_id UUID REFERENCES route_segments(id) ON DELETE CASCADE,
  seat_type VARCHAR(50),         -- e.g. "SLEEPER", "SEATER"
  base_fare NUMERIC(10,2) NOT NULL,
  gst_percent NUMERIC(5,2) DEFAULT 0.0,
  effective_from DATE,
  effective_to DATE
);
