ALTER TABLE booking_seats
    DROP CONSTRAINT IF EXISTS booking_seats_passenger_id_fkey;

ALTER TABLE booking_seats
    ADD CONSTRAINT booking_seats_passenger_id_fkey
    FOREIGN KEY (passenger_id) REFERENCES passengers(id) ON DELETE SET NULL;
