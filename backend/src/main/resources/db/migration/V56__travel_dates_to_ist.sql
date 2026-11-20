-- Travel dates used to be derived from the departure's UTC date.
-- They are now IST dates (see AppTime). A departure between 00:00 and 05:30 IST falls on the
-- previous UTC day, so bookings made under the old rule carry a travel_date one day early.
-- AT TIME ZONE makes this independent of the database session time zone.
UPDATE bookings b
SET travel_date = b.travel_date + 1
FROM route_schedules s
WHERE s.id = b.route_schedule_id
  AND b.travel_date IS NOT NULL
  AND (s.departure_time AT TIME ZONE 'Asia/Kolkata')::time < TIME '05:30';
