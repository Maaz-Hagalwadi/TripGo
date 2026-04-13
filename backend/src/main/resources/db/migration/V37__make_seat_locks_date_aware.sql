ALTER TABLE seat_locks
ADD COLUMN travel_date DATE;

UPDATE seat_locks sl
SET travel_date = (rs.departure_time AT TIME ZONE 'UTC')::date
FROM route_schedules rs
WHERE rs.id = sl.route_schedule_id
  AND sl.travel_date IS NULL;

ALTER TABLE seat_locks
ALTER COLUMN travel_date SET NOT NULL;

ALTER TABLE seat_locks
DROP CONSTRAINT IF EXISTS uq_route_schedule_seat_lock;

ALTER TABLE seat_locks
ADD CONSTRAINT uq_route_schedule_seat_lock UNIQUE (route_schedule_id, seat_number, travel_date);
