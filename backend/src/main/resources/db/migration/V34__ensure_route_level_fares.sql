-- For any segment+seatType that only has bus-specific fares (bus_id NOT NULL)
-- but no route-level fare (bus_id IS NULL), create a route-level copy
-- using the average base_fare of existing bus-specific fares
INSERT INTO fares (id, route_id, route_segment_id, seat_type, base_fare, gst_percent, bus_id)
SELECT
    gen_random_uuid(),
    f.route_id,
    f.route_segment_id,
    f.seat_type,
    AVG(f.base_fare),
    MAX(f.gst_percent),
    NULL
FROM fares f
WHERE f.bus_id IS NOT NULL
GROUP BY f.route_id, f.route_segment_id, f.seat_type
HAVING COUNT(CASE WHEN f.bus_id IS NULL THEN 1 END) = 0
ON CONFLICT DO NOTHING;
