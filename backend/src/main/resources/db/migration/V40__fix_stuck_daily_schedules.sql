-- Fix stuck prod schedules:
-- 7e323a4e: STARTED + active=false → mark COMPLETED + active=false (trip happened, just never completed)
-- ed111176: COMPLETED + active=true → mark active=false (completed trips should not be active)
-- Then create the next-day rollover for the DAILY route since the scheduler never did it

UPDATE route_schedules
SET trip_status = 'COMPLETED', active = false
WHERE id = '7e323a4e-8b32-405a-b487-e5a311e16c5a';

UPDATE route_schedules
SET active = false
WHERE id = 'ed111176-f40f-4ca8-aff5-3ddf8ec074f0';

-- Create the next-day rollover schedule for the DAILY route (2026-04-14)
INSERT INTO route_schedules (id, route_id, bus_id, departure_time, arrival_time, frequency, active, trip_status, created_at, updated_at)
SELECT
    gen_random_uuid(),
    route_id,
    bus_id,
    departure_time + INTERVAL '1 day',
    arrival_time + INTERVAL '1 day',
    frequency,
    true,
    'SCHEDULED',
    now(),
    now()
FROM route_schedules
WHERE id = 'ed111176-f40f-4ca8-aff5-3ddf8ec074f0';
