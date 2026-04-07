-- Add bus_id to fares (nullable for backward compatibility)
ALTER TABLE fares ADD COLUMN IF NOT EXISTS bus_id UUID REFERENCES buses(id) ON DELETE CASCADE;

-- Drop old unique constraint
ALTER TABLE fares DROP CONSTRAINT IF EXISTS uq_fare_segment_seattype;

-- New unique constraint: per segment + seatType + bus (bus_id can be null = route-level default)
ALTER TABLE fares ADD CONSTRAINT uq_fare_segment_seattype_bus
    UNIQUE (route_segment_id, seat_type, bus_id);
