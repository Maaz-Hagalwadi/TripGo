-- seats: seat map per bus
CREATE TABLE seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  seat_number VARCHAR(20) NOT NULL,
  row_no VARCHAR(10),
  seat_type VARCHAR(50),
  seat_position JSONB, -- meta (x,y,pos) for UI layout if needed
  is_window BOOLEAN DEFAULT FALSE,
  is_aisle BOOLEAN DEFAULT FALSE,
  CONSTRAINT uq_bus_seat UNIQUE (bus_id, seat_number)
);

-- bus_amenities (structured list, optional; amenities also stored in buses.amenities)
CREATE TABLE amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  code VARCHAR(100),
  description VARCHAR(255)
);
