ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_phone  VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_bookings_guest_email
    ON bookings (guest_email)
    WHERE guest_email IS NOT NULL;
