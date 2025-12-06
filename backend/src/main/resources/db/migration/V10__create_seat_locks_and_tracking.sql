-- seat locks to prevent double booking (short lived)
CREATE TABLE seat_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_schedule_id UUID NOT NULL REFERENCES route_schedules(id) ON DELETE CASCADE,
  seat_number VARCHAR(20) NOT NULL,
  lock_token UUID NOT NULL,
  locked_by_user_id UUID REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT uq_route_schedule_seat_lock UNIQUE (route_schedule_id, seat_number)
);

-- bus tracking (lat/lon telemetry)
CREATE TABLE bus_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES buses(id),
  route_schedule_id UUID REFERENCES route_schedules(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  speed_kmph NUMERIC(6,2),
  heading NUMERIC(6,2),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
