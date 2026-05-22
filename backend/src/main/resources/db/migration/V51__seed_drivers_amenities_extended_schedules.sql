-- =============================================================
-- V51: Drivers, bus amenities, extended schedules (Jun 9–Jul 31),
--      boarding/dropping points for new schedules, schedule policies
-- =============================================================

-- ── 1. DRIVERS ───────────────────────────────────────────────
INSERT INTO drivers (id, operator_id, first_name, last_name,
                     phone, license_number, license_expiry, created_at)
VALUES
  ('d1000001-deed-0000-0000-000000000001',
   'a0000002-deed-0000-0000-000000000001',
   'Rajesh', 'Kumar', '+91-9812345678', 'AP2019012345', '2027-08-15', now()),

  ('d2000001-deed-0000-0000-000000000001',
   'a0000002-deed-0000-0000-000000000001',
   'Suresh', 'Yadav', '+91-9823456789', 'MH2018023456', '2026-11-30', now()),

  ('d3000001-deed-0000-0000-000000000001',
   'a0000002-deed-0000-0000-000000000001',
   'Mohan',  'Reddy', '+91-9834567890', 'DL2020034567', '2028-03-22', now())

ON CONFLICT (id) DO NOTHING;

-- ── 2. BUS AMENITIES ─────────────────────────────────────────
-- Bus 1 – Volvo AC Sleeper: WiFi, AC, Charger, Blanket, Water
-- Bus 2 – Volvo Multi-Axle Seater: WiFi, AC, Charger, Water
-- Bus 3 – Semi-Sleeper AC: AC, Charger, Blanket
INSERT INTO bus_amenities (bus_id, amenity_id)
SELECT b.bus_id::uuid, a.id
FROM (VALUES
  ('b0000001-deed-0000-0000-000000000001', 'WIFI'),
  ('b0000001-deed-0000-0000-000000000001', 'AC'),
  ('b0000001-deed-0000-0000-000000000001', 'CHARGER'),
  ('b0000001-deed-0000-0000-000000000001', 'BLANKET'),
  ('b0000001-deed-0000-0000-000000000001', 'WATER'),
  ('b0000002-deed-0000-0000-000000000001', 'WIFI'),
  ('b0000002-deed-0000-0000-000000000001', 'AC'),
  ('b0000002-deed-0000-0000-000000000001', 'CHARGER'),
  ('b0000002-deed-0000-0000-000000000001', 'WATER'),
  ('b0000003-deed-0000-0000-000000000001', 'AC'),
  ('b0000003-deed-0000-0000-000000000001', 'CHARGER'),
  ('b0000003-deed-0000-0000-000000000001', 'BLANKET')
) AS b(bus_id, code)
JOIN amenity_master a ON a.code = b.code
ON CONFLICT DO NOTHING;

-- ── 3. EXTENDED SCHEDULES ────────────────────────────────────
-- Hyderabad → Bangalore: Jun 9 – Jul 31, 21:00 IST, alternating Bus 1/2
INSERT INTO route_schedules (id, route_id, bus_id,
                              departure_time, arrival_time,
                              frequency, active, trip_status,
                              created_at, updated_at)
SELECT
  gen_random_uuid(),
  'c0000001-deed-0000-0000-000000000001',
  CASE WHEN n % 2 = 0
       THEN 'b0000001-deed-0000-0000-000000000001'::uuid
       ELSE 'b0000002-deed-0000-0000-000000000001'::uuid
  END,
  (DATE '2026-06-09' + n + TIME '15:30:00')::timestamptz,   -- 21:00 IST = 15:30 UTC
  (DATE '2026-06-10' + n + TIME '01:00:00')::timestamptz,   -- 06:30 IST next day = 01:00 UTC
  'DAILY', true, 'SCHEDULED', now(), now()
FROM generate_series(0, (DATE '2026-07-31' - DATE '2026-06-09')::int) AS n;

-- Mumbai → Pune: Jun 4 – Jul 31, 07:00 and 14:00 IST, Bus 3
INSERT INTO route_schedules (id, route_id, bus_id,
                              departure_time, arrival_time,
                              frequency, active, trip_status,
                              created_at, updated_at)
SELECT
  gen_random_uuid(),
  'c0000002-deed-0000-0000-000000000001',
  'b0000003-deed-0000-0000-000000000001',
  (d + t.dep_utc)::timestamptz,
  (d + t.arr_utc)::timestamptz,
  'DAILY', true, 'SCHEDULED', now(), now()
FROM generate_series(DATE '2026-06-04', DATE '2026-07-31', INTERVAL '1 day') AS d
CROSS JOIN (VALUES
  (TIME '01:30:00', TIME '04:30:00'),   -- 07:00 IST dep, 10:00 IST arr
  (TIME '08:30:00', TIME '11:30:00')    -- 14:00 IST dep, 17:00 IST arr
) AS t(dep_utc, arr_utc);

-- Delhi → Jaipur: Jun 5 – Jul 31, 07:00 IST (Bus 1) + 18:00 IST (Bus 2)
INSERT INTO route_schedules (id, route_id, bus_id,
                              departure_time, arrival_time,
                              frequency, active, trip_status,
                              created_at, updated_at)
SELECT
  gen_random_uuid(),
  'c0000003-deed-0000-0000-000000000001',
  t.bus_id::uuid,
  (d + t.dep_utc)::timestamptz,
  (d + t.arr_utc)::timestamptz,
  'DAILY', true, 'SCHEDULED', now(), now()
FROM generate_series(DATE '2026-06-05', DATE '2026-07-31', INTERVAL '1 day') AS d
CROSS JOIN (VALUES
  ('b0000001-deed-0000-0000-000000000001', TIME '01:30:00', TIME '06:30:00'),  -- 07:00 IST dep, 12:00 IST arr
  ('b0000002-deed-0000-0000-000000000001', TIME '12:30:00', TIME '17:30:00')   -- 18:00 IST dep, 23:00 IST arr
) AS t(bus_id, dep_utc, arr_utc);

-- ── 4. BOARDING & DROPPING POINTS for new schedules ──────────
-- Hyderabad → Bangalore (all schedules without points yet)
INSERT INTO boarding_dropping_points
       (schedule_id, name, type, address, arrival_time, landmark)
SELECT rs.id, bp.name, bp.type, bp.address, bp.arrival_time::time, bp.landmark
FROM   route_schedules rs
CROSS JOIN (VALUES
  ('Majestic Bus Stand',    'BOARDING', 'Gurudwara Rd, Majestic, Hyderabad',     '21:00', 'Near Hyderabad Railway Station'),
  ('Mehdipatnam X-Road',   'BOARDING', 'Mehdipatnam Junction, Hyderabad',         '21:30', 'Old City direction exit'),
  ('Shamshabad Toll',      'BOARDING', 'RGIA Exit Road, Shamshabad',              '22:00', 'Near Rajiv Gandhi Airport'),
  ('KR Puram Flyover',     'DROPPING', 'KR Puram, Outer Ring Road, Bengaluru',   '06:00', 'East Bengaluru approach'),
  ('Majestic Bus Terminal','DROPPING', 'Kempegowda Bus Station, Bengaluru',       '06:30', 'Central Bengaluru')
) AS bp(name, type, address, arrival_time, landmark)
WHERE  rs.route_id = 'c0000001-deed-0000-0000-000000000001'
  AND  NOT EXISTS (
    SELECT 1 FROM boarding_dropping_points bdp
    WHERE  bdp.schedule_id = rs.id AND bdp.name = bp.name
  );

-- Mumbai → Pune
INSERT INTO boarding_dropping_points
       (schedule_id, name, type, address, arrival_time, landmark)
SELECT rs.id, bp.name, bp.type, bp.address, bp.arrival_time::time, bp.landmark
FROM   route_schedules rs
CROSS JOIN (VALUES
  ('Dadar Bus Depot',        'BOARDING', 'Dadar, Mumbai 400014',              '07:00', 'Near Dadar Railway Station'),
  ('Sion Circle',            'BOARDING', 'Sion, Mumbai 400022',               '07:20', 'Next to Sion Hospital'),
  ('Lonavala Bus Stop',      'BOARDING', 'Old Mumbai-Pune Hwy, Lonavala',     '08:15', 'Highway dhaba landmark'),
  ('Wakad Phata',            'DROPPING', 'Wakad, Pimpri-Chinchwad, Pune',     '09:30', 'Pune IT Park area'),
  ('Shivajinagar Bus Stand', 'DROPPING', 'Shivajinagar, Pune 411005',         '10:00', 'Near Pune University')
) AS bp(name, type, address, arrival_time, landmark)
WHERE  rs.route_id = 'c0000002-deed-0000-0000-000000000001'
  AND  NOT EXISTS (
    SELECT 1 FROM boarding_dropping_points bdp
    WHERE  bdp.schedule_id = rs.id AND bdp.name = bp.name
  );

-- Delhi → Jaipur
INSERT INTO boarding_dropping_points
       (schedule_id, name, type, address, arrival_time, landmark)
SELECT rs.id, bp.name, bp.type, bp.address, bp.arrival_time::time, bp.landmark
FROM   route_schedules rs
CROSS JOIN (VALUES
  ('Kashmere Gate ISBT',   'BOARDING', 'Kashmere Gate, Delhi 110006',    '07:00', 'Kashmere Gate Metro Station'),
  ('Dhaula Kuan',          'BOARDING', 'Dhaula Kuan, New Delhi 110021',   '07:30', 'Near Army HQ'),
  ('Gurugram Toll Plaza',  'BOARDING', 'NH-48, Gurugram 122001',          '08:00', 'Rajiv Chowk Exit'),
  ('Sindhi Camp Bus Stand','DROPPING', 'Sindhi Camp, Jaipur 302001',     '11:30', 'Central Jaipur'),
  ('Narayan Singh Circle', 'DROPPING', 'Narayan Singh Circle, Jaipur',   '12:00', 'Near Jaipur Railway Station')
) AS bp(name, type, address, arrival_time, landmark)
WHERE  rs.route_id = 'c0000003-deed-0000-0000-000000000001'
  AND  NOT EXISTS (
    SELECT 1 FROM boarding_dropping_points bdp
    WHERE  bdp.schedule_id = rs.id AND bdp.name = bp.name
  );

-- ── 5. SCHEDULE POLICIES for all schedules ───────────────────
-- Hyderabad → Bangalore
INSERT INTO schedule_policies
       (schedule_id, luggage_policy, children_policy,
        pets_allowed, liquor_allowed, smoking_allowed,
        pickup_notes, rest_stops,
        date_change_allowed, date_change_fee_percent, date_change_min_hours)
SELECT rs.id,
  '1 bag up to 15 kg free; extra bags ₹100 each',
  'Children below 5 travel free with a ticket-holding adult',
  false, false, false,
  'Please arrive 15 minutes before departure with a valid photo ID.',
  '[{"location":"Nalgonda Highway Dhaba","arrivalTime":"23:30","durationMinutes":20},{"location":"Anantapur Rest Area","arrivalTime":"02:00","durationMinutes":15}]'::jsonb,
  true, 10, 12
FROM route_schedules rs
WHERE rs.route_id = 'c0000001-deed-0000-0000-000000000001'
  AND NOT EXISTS (SELECT 1 FROM schedule_policies sp WHERE sp.schedule_id = rs.id);

-- Mumbai → Pune
INSERT INTO schedule_policies
       (schedule_id, luggage_policy, children_policy,
        pets_allowed, liquor_allowed, smoking_allowed,
        pickup_notes, rest_stops,
        date_change_allowed, date_change_fee_percent, date_change_min_hours)
SELECT rs.id,
  '1 bag up to 10 kg free; extra bags ₹80 each',
  'Children below 5 travel free with a ticket-holding adult',
  false, false, false,
  'Please arrive 10 minutes before departure. Bus departs on time.',
  '[]'::jsonb,
  true, 10, 6
FROM route_schedules rs
WHERE rs.route_id = 'c0000002-deed-0000-0000-000000000001'
  AND NOT EXISTS (SELECT 1 FROM schedule_policies sp WHERE sp.schedule_id = rs.id);

-- Delhi → Jaipur
INSERT INTO schedule_policies
       (schedule_id, luggage_policy, children_policy,
        pets_allowed, liquor_allowed, smoking_allowed,
        pickup_notes, rest_stops,
        date_change_allowed, date_change_fee_percent, date_change_min_hours)
SELECT rs.id,
  '1 bag up to 15 kg free; extra bags ₹100 each',
  'Children below 5 travel free with a ticket-holding adult',
  false, false, false,
  'Please arrive 15 minutes before departure with a valid photo ID.',
  '[{"location":"Behror Highway Rest Stop","arrivalTime":"09:15","durationMinutes":15}]'::jsonb,
  true, 10, 12
FROM route_schedules rs
WHERE rs.route_id = 'c0000003-deed-0000-0000-000000000001'
  AND NOT EXISTS (SELECT 1 FROM schedule_policies sp WHERE sp.schedule_id = rs.id);
