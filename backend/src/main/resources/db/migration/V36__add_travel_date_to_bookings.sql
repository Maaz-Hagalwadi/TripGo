ALTER TABLE bookings ADD COLUMN IF NOT EXISTS travel_date DATE;

-- Backfill existing bookings from schedule departure_time
UPDATE bookings b
SET travel_date = DATE(rs.departure_time AT TIME ZONE 'UTC')
FROM route_schedules rs
WHERE b.route_schedule_id = rs.id
AND b.travel_date IS NULL;
