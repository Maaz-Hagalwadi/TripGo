ALTER TABLE seat_locks
ADD COLUMN from_stop VARCHAR(255),
ADD COLUMN to_stop VARCHAR(255);

UPDATE seat_locks sl
SET from_stop = r.origin,
    to_stop = r.destination
FROM route_schedules rs
JOIN routes r ON r.id = rs.route_id
WHERE rs.id = sl.route_schedule_id
  AND (sl.from_stop IS NULL OR sl.to_stop IS NULL);

ALTER TABLE seat_locks
ALTER COLUMN from_stop SET NOT NULL,
ALTER COLUMN to_stop SET NOT NULL;

ALTER TABLE seat_locks
DROP CONSTRAINT IF EXISTS uq_route_schedule_seat_lock;

ALTER TABLE seat_locks
ADD CONSTRAINT uq_route_schedule_seat_lock UNIQUE (route_schedule_id, seat_number, travel_date, from_stop, to_stop);
