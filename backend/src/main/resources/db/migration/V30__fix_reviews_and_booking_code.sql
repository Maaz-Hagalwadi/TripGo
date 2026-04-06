-- Fix reviews table: add missing columns
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS bus_id UUID REFERENCES buses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS route_schedule_id UUID REFERENCES route_schedules(id) ON DELETE SET NULL;

-- Add booking_code to bookings for public reference
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS booking_code VARCHAR(20) UNIQUE;

-- Generate booking codes for existing bookings
UPDATE bookings SET booking_code = UPPER(SUBSTRING(id::text, 1, 8)) WHERE booking_code IS NULL;
