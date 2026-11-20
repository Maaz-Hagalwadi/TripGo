-- The daily roll-over job had no duplicate protection, so concurrent runs created many identical
-- active schedules (same bus, route and departure). Each copy had its own seat map, so the same
-- physical seat could be sold several times, and search listed the same bus over and over.
--
-- 1) Keep one active schedule per (bus, route, departure_time) and deactivate the copies.
--    Nothing is deleted. The kept row is the one with the most bookings, then the oldest.
--    Copies without bookings are also marked CANCELLED so the roll-over job ignores them;
--    copies that do have bookings keep their status (their passengers still travel) but,
--    being inactive, no longer spawn new days or appear in search.
WITH booking_counts AS (
    SELECT route_schedule_id, COUNT(*) AS n
    FROM bookings
    GROUP BY route_schedule_id
),
ranked AS (
    SELECT rs.id,
           COALESCE(bc.n, 0) AS bookings,
           ROW_NUMBER() OVER (
               PARTITION BY rs.bus_id, rs.route_id, rs.departure_time
               ORDER BY COALESCE(bc.n, 0) DESC, rs.created_at ASC NULLS LAST, rs.id
           ) AS rn
    FROM route_schedules rs
    LEFT JOIN booking_counts bc ON bc.route_schedule_id = rs.id
    WHERE rs.active = true
)
UPDATE route_schedules rs
SET active = false,
    trip_status = CASE WHEN ranked.bookings = 0 THEN 'CANCELLED' ELSE rs.trip_status END
FROM ranked
WHERE rs.id = ranked.id
  AND ranked.rn > 1;

-- 2) Database-level guarantee: at most one active schedule per bus, route and departure time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_route_schedules_active_departure
    ON route_schedules (bus_id, route_id, departure_time)
    WHERE active = true;
