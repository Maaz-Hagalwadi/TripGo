-- passengers (passenger profiles for bookings)
CREATE TABLE passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id), -- optional owner
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  age INT,
  gender VARCHAR(10),
  phone VARCHAR(30),
  id_type VARCHAR(50), -- 'AADHAAR', 'DRIVING_LICENSE', etc.
  id_no VARCHAR(150),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  route_schedule_id UUID NOT NULL REFERENCES route_schedules(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES operators(id),
  total_amount NUMERIC(12,2) NOT NULL,
  gst_amount NUMERIC(12,2) DEFAULT 0.0,
  discount_amount NUMERIC(12,2) DEFAULT 0.0,
  payable_amount NUMERIC(12,2) NOT NULL, -- total_amount + gst - discount
  status VARCHAR(50) NOT NULL,           -- PENDING, CONFIRMED, CANCELLED, RESCHEDULED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- booking_seats: one row per seat booked
CREATE TABLE booking_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  seat_id UUID REFERENCES seats(id),
  seat_number VARCHAR(20) NOT NULL,
  fare NUMERIC(10,2) NOT NULL,
  passenger_id UUID REFERENCES passengers(id),
  CONSTRAINT uq_booking_seat UNIQUE (booking_id, seat_number)
);
