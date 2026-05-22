-- =============================================================
-- V52: Demo accounts + 10 bookings + 4 reviews
-- Accounts  (password for all: TripGo@2026)
--   USER     → tripgo.user@yopmail.com
--   OPERATOR → tripgo.operator@yopmail.com  (linked to TripGo Travels)
--   ADMIN    → tripgo.admin@yopmail.com
-- =============================================================

-- ── 1. USERS ─────────────────────────────────────────────────
-- Creates each account if the email doesn't already exist.
-- All subsequent statements look up users by email so they work
-- regardless of which UUID was assigned.

INSERT INTO users (id, first_name, last_name, email, password,
                   is_email_verified, created_at, updated_at)
VALUES
  ('f1000001-deed-0000-0000-000000000002',
   'TripGo', 'User', 'tripgo.user@yopmail.com',
   crypt('TripGo@2026', gen_salt('bf', 10)),
   true, now(), now()),

  ('f2000001-deed-0000-0000-000000000002',
   'TripGo', 'Operator', 'tripgo.operator@yopmail.com',
   crypt('TripGo@2026', gen_salt('bf', 10)),
   true, now(), now()),

  ('f3000001-deed-0000-0000-000000000002',
   'TripGo', 'Admin', 'tripgo.admin@yopmail.com',
   crypt('TripGo@2026', gen_salt('bf', 10)),
   true, now(), now())
ON CONFLICT (email) DO NOTHING;

-- ── USER ROLES (resolved by email) ───────────────────────────

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'tripgo.user@yopmail.com' AND r.name = 'ROLE_USER'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'tripgo.operator@yopmail.com' AND r.name = 'ROLE_OPERATOR'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'tripgo.admin@yopmail.com' AND r.name = 'ROLE_ADMIN'
ON CONFLICT DO NOTHING;

-- Link operator account to existing TripGo Travels operator
UPDATE users
SET    operator_id = 'a0000002-deed-0000-0000-000000000001'
WHERE  email       = 'tripgo.operator@yopmail.com'
  AND  operator_id IS NULL;

-- ── 2. PAST SCHEDULES (for completed bookings) ───────────────

INSERT INTO route_schedules (id, route_id, bus_id,
                              departure_time, arrival_time,
                              frequency, active, trip_status,
                              created_at, updated_at)
VALUES
  ('e1000001-deed-0000-0000-000000000002',
   'c0000001-deed-0000-0000-000000000001',
   'b0000001-deed-0000-0000-000000000001',
   '2026-04-15 15:30:00+00', '2026-04-16 01:00:00+00',
   'DAILY', false, 'COMPLETED', now(), now()),

  ('e1000002-deed-0000-0000-000000000002',
   'c0000001-deed-0000-0000-000000000001',
   'b0000002-deed-0000-0000-000000000001',
   '2026-04-28 15:30:00+00', '2026-04-29 01:00:00+00',
   'DAILY', false, 'COMPLETED', now(), now()),

  ('e1000003-deed-0000-0000-000000000002',
   'c0000002-deed-0000-0000-000000000001',
   'b0000003-deed-0000-0000-000000000001',
   '2026-05-03 01:30:00+00', '2026-05-03 04:30:00+00',
   'DAILY', false, 'COMPLETED', now(), now()),

  ('e1000004-deed-0000-0000-000000000002',
   'c0000003-deed-0000-0000-000000000001',
   'b0000001-deed-0000-0000-000000000001',
   '2026-05-12 01:30:00+00', '2026-05-12 06:30:00+00',
   'DAILY', false, 'COMPLETED', now(), now()),

  ('e1000005-deed-0000-0000-000000000002',
   'c0000001-deed-0000-0000-000000000001',
   'b0000001-deed-0000-0000-000000000001',
   '2026-05-20 15:30:00+00', '2026-05-21 01:00:00+00',
   'DAILY', false, 'COMPLETED', now(), now())

ON CONFLICT (id) DO NOTHING;

-- ── 3. PASSENGERS (user_id resolved by email) ────────────────

INSERT INTO passengers (id, user_id, first_name, last_name,
                        age, gender, phone, id_type, id_no, created_at)
SELECT v.id, u.id, 'TripGo', 'User', 28, 'MALE', '+91-9900001001', 'AADHAAR', '1234-5678-9001', now()
FROM users u
CROSS JOIN (VALUES
  ('ab000001-deed-0000-0000-000000000002'::uuid),
  ('ab000002-deed-0000-0000-000000000002'::uuid),
  ('ab000003-deed-0000-0000-000000000002'::uuid),
  ('ab000004-deed-0000-0000-000000000002'::uuid),
  ('ab000005-deed-0000-0000-000000000002'::uuid),
  ('ab000006-deed-0000-0000-000000000002'::uuid),
  ('ab000007-deed-0000-0000-000000000002'::uuid),
  ('ab000008-deed-0000-0000-000000000002'::uuid),
  ('ab000009-deed-0000-0000-000000000002'::uuid),
  ('ab00000a-deed-0000-0000-000000000002'::uuid)
) v(id)
WHERE u.email = 'tripgo.user@yopmail.com'
ON CONFLICT (id) DO NOTHING;

-- ── 4. BOOKINGS (user_id resolved by email) ──────────────────

INSERT INTO bookings (id, user_id, route_schedule_id, operator_id,
                      total_amount, gst_amount, discount_amount, payable_amount,
                      status, booking_code, travel_date,
                      created_at, updated_at)
SELECT
  v.id, u.id, v.route_schedule_id,
  'a0000002-deed-0000-0000-000000000001'::uuid,
  v.total_amount, v.gst_amount, 0.00, v.payable_amount,
  v.status, v.booking_code, v.travel_date,
  v.created_at, v.updated_at
FROM users u
CROSS JOIN (VALUES
  -- 1. COMPLETED: HYD→BLR Apr 15
  ('bb000001-deed-0000-0000-000000000002'::uuid, 'e1000001-deed-0000-0000-000000000002'::uuid, 850.00::numeric, 42.50::numeric, 892.50::numeric, 'COMPLETED', 'BB000001', '2026-04-15'::date, '2026-04-14 18:00:00+00'::timestamptz, '2026-04-16 07:00:00+00'::timestamptz),
  -- 2. COMPLETED: HYD→BLR Apr 28
  ('bb000002-deed-0000-0000-000000000002'::uuid, 'e1000002-deed-0000-0000-000000000002'::uuid, 610.00::numeric, 30.50::numeric, 640.50::numeric, 'COMPLETED', 'BB000002', '2026-04-28'::date, '2026-04-27 12:00:00+00'::timestamptz, '2026-04-29 02:00:00+00'::timestamptz),
  -- 3. COMPLETED: MUM→PNE May 3
  ('bb000003-deed-0000-0000-000000000002'::uuid, 'e1000003-deed-0000-0000-000000000002'::uuid, 350.00::numeric, 17.50::numeric, 367.50::numeric, 'COMPLETED', 'BB000003', '2026-05-03'::date, '2026-05-02 20:00:00+00'::timestamptz, '2026-05-03 06:00:00+00'::timestamptz),
  -- 4. COMPLETED: DEL→JAI May 12
  ('bb000004-deed-0000-0000-000000000002'::uuid, 'e1000004-deed-0000-0000-000000000002'::uuid, 720.00::numeric, 36.00::numeric, 756.00::numeric, 'COMPLETED', 'BB000004', '2026-05-12'::date, '2026-05-11 15:00:00+00'::timestamptz, '2026-05-12 08:00:00+00'::timestamptz),
  -- 5. COMPLETED: HYD→BLR May 20
  ('bb000005-deed-0000-0000-000000000002'::uuid, 'e1000005-deed-0000-0000-000000000002'::uuid, 850.00::numeric, 42.50::numeric, 892.50::numeric, 'COMPLETED', 'BB000005', '2026-05-20'::date, '2026-05-19 14:00:00+00'::timestamptz, '2026-05-21 02:00:00+00'::timestamptz),
  -- 6. CONFIRMED: HYD→BLR Jun 1
  ('bb000006-deed-0000-0000-000000000002'::uuid, 'e0000001-deed-0000-0000-000000000001'::uuid, 850.00::numeric, 42.50::numeric, 892.50::numeric, 'CONFIRMED', 'BB000006', '2026-06-01'::date, now()::timestamptz, now()::timestamptz),
  -- 7. CONFIRMED: MUM→PNE Jun 1
  ('bb000007-deed-0000-0000-000000000002'::uuid, 'e0000009-deed-0000-0000-000000000001'::uuid, 350.00::numeric, 17.50::numeric, 367.50::numeric, 'CONFIRMED', 'BB000007', '2026-06-01'::date, now()::timestamptz, now()::timestamptz),
  -- 8. CONFIRMED: DEL→JAI Jun 1
  ('bb000008-deed-0000-0000-000000000002'::uuid, 'e0000015-deed-0000-0000-000000000001'::uuid, 720.00::numeric, 36.00::numeric, 756.00::numeric, 'CONFIRMED', 'BB000008', '2026-06-01'::date, now()::timestamptz, now()::timestamptz),
  -- 9. CANCELLED: HYD→BLR Jun 2
  ('bb000009-deed-0000-0000-000000000002'::uuid, 'e0000002-deed-0000-0000-000000000001'::uuid, 610.00::numeric, 30.50::numeric, 640.50::numeric, 'CANCELLED', 'BB000009', '2026-06-02'::date, now()::timestamptz, now()::timestamptz),
  -- 10. CANCELLED: MUM→PNE Jun 1
  ('bb00000a-deed-0000-0000-000000000002'::uuid, 'e0000010-deed-0000-0000-000000000001'::uuid, 350.00::numeric, 17.50::numeric, 367.50::numeric, 'CANCELLED', 'BB00000A', '2026-06-01'::date, now()::timestamptz, now()::timestamptz)
) v(id, route_schedule_id, total_amount, gst_amount, payable_amount, status, booking_code, travel_date, created_at, updated_at)
WHERE u.email = 'tripgo.user@yopmail.com'
ON CONFLICT (id) DO NOTHING;

-- Cancellation metadata
UPDATE bookings
SET cancelled_by  = 'USER',
    cancel_reason = 'Change of plans',
    cancelled_at  = now(),
    refund_amount = payable_amount,
    refund_status = 'REFUNDED'
WHERE id IN (
  'bb000009-deed-0000-0000-000000000002',
  'bb00000a-deed-0000-0000-000000000002'
) AND status = 'CANCELLED';

-- ── 5. BOOKING SEATS ─────────────────────────────────────────

INSERT INTO booking_seats (id, booking_id, seat_id, seat_number, fare, passenger_id)
VALUES
  ('af000001-deed-0000-0000-000000000002', 'bb000001-deed-0000-0000-000000000002', NULL, 'L3',  892.50, 'ab000001-deed-0000-0000-000000000002'),
  ('af000002-deed-0000-0000-000000000002', 'bb000002-deed-0000-0000-000000000002', NULL, 'A5',  640.50, 'ab000002-deed-0000-0000-000000000002'),
  ('af000003-deed-0000-0000-000000000002', 'bb000003-deed-0000-0000-000000000002', NULL, 'A2',  367.50, 'ab000003-deed-0000-0000-000000000002'),
  ('af000004-deed-0000-0000-000000000002', 'bb000004-deed-0000-0000-000000000002', NULL, 'L4',  756.00, 'ab000004-deed-0000-0000-000000000002'),
  ('af000005-deed-0000-0000-000000000002', 'bb000005-deed-0000-0000-000000000002', NULL, 'L7',  892.50, 'ab000005-deed-0000-0000-000000000002'),
  ('af000006-deed-0000-0000-000000000002', 'bb000006-deed-0000-0000-000000000002', NULL, 'L9',  892.50, 'ab000006-deed-0000-0000-000000000002'),
  ('af000007-deed-0000-0000-000000000002', 'bb000007-deed-0000-0000-000000000002', NULL, 'A4',  367.50, 'ab000007-deed-0000-0000-000000000002'),
  ('af000008-deed-0000-0000-000000000002', 'bb000008-deed-0000-0000-000000000002', NULL, 'L11', 756.00, 'ab000008-deed-0000-0000-000000000002'),
  ('af000009-deed-0000-0000-000000000002', 'bb000009-deed-0000-0000-000000000002', NULL, 'A7',  640.50, 'ab000009-deed-0000-0000-000000000002'),
  ('af00000a-deed-0000-0000-000000000002', 'bb00000a-deed-0000-0000-000000000002', NULL, 'B3',  367.50, 'ab00000a-deed-0000-0000-000000000002')
ON CONFLICT (booking_id, seat_number) DO NOTHING;

-- ── 6. PAYMENTS ──────────────────────────────────────────────

INSERT INTO payments (id, booking_id, provider, provider_transaction_id,
                      amount, status, created_at)
VALUES
  ('ac000001-deed-0000-0000-000000000002', 'bb000001-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb000001', 892.50, 'SUCCESS', '2026-04-14 18:30:00+00'),
  ('ac000002-deed-0000-0000-000000000002', 'bb000002-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb000002', 640.50, 'SUCCESS', '2026-04-27 12:30:00+00'),
  ('ac000003-deed-0000-0000-000000000002', 'bb000003-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb000003', 367.50, 'SUCCESS', '2026-05-02 20:30:00+00'),
  ('ac000004-deed-0000-0000-000000000002', 'bb000004-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb000004', 756.00, 'SUCCESS', '2026-05-11 15:30:00+00'),
  ('ac000005-deed-0000-0000-000000000002', 'bb000005-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb000005', 892.50, 'SUCCESS', '2026-05-19 14:30:00+00'),
  ('ac000006-deed-0000-0000-000000000002', 'bb000006-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb000006', 892.50, 'SUCCESS', now()),
  ('ac000007-deed-0000-0000-000000000002', 'bb000007-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb000007', 367.50, 'SUCCESS', now()),
  ('ac000008-deed-0000-0000-000000000002', 'bb000008-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb000008', 756.00, 'SUCCESS', now()),
  ('ac000009-deed-0000-0000-000000000002', 'bb000009-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb000009', 640.50, 'REFUNDED',  now()),
  ('ac00000a-deed-0000-0000-000000000002', 'bb00000a-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb00000a', 367.50, 'REFUNDED',  now())
ON CONFLICT (id) DO NOTHING;

-- ── 7. TICKETS (completed + confirmed only) ───────────────────

INSERT INTO tickets (id, booking_id, ticket_no, status, created_at)
VALUES
  ('ad000001-deed-0000-0000-000000000002', 'bb000001-deed-0000-0000-000000000002', 'TKT-BB000001', 'ACTIVE', '2026-04-14 18:30:00+00'),
  ('ad000002-deed-0000-0000-000000000002', 'bb000002-deed-0000-0000-000000000002', 'TKT-BB000002', 'ACTIVE', '2026-04-27 12:30:00+00'),
  ('ad000003-deed-0000-0000-000000000002', 'bb000003-deed-0000-0000-000000000002', 'TKT-BB000003', 'ACTIVE', '2026-05-02 20:30:00+00'),
  ('ad000004-deed-0000-0000-000000000002', 'bb000004-deed-0000-0000-000000000002', 'TKT-BB000004', 'ACTIVE', '2026-05-11 15:30:00+00'),
  ('ad000005-deed-0000-0000-000000000002', 'bb000005-deed-0000-0000-000000000002', 'TKT-BB000005', 'ACTIVE', '2026-05-19 14:30:00+00'),
  ('ad000006-deed-0000-0000-000000000002', 'bb000006-deed-0000-0000-000000000002', 'TKT-BB000006', 'ACTIVE', now()),
  ('ad000007-deed-0000-0000-000000000002', 'bb000007-deed-0000-0000-000000000002', 'TKT-BB000007', 'ACTIVE', now()),
  ('ad000008-deed-0000-0000-000000000002', 'bb000008-deed-0000-0000-000000000002', 'TKT-BB000008', 'ACTIVE', now())
ON CONFLICT (ticket_no) DO NOTHING;

-- ── 8. REVIEWS (user_id resolved by email) ────────────────────

INSERT INTO reviews (id, user_id, route_id, operator_id, bus_id, route_schedule_id,
                     rating, title, comment, travel_date,
                     hidden, moderation_status, created_at, updated_at)
SELECT
  v.id, u.id, v.route_id, v.operator_id, v.bus_id, v.route_schedule_id,
  v.rating, v.title, v.comment, v.travel_date,
  false, 'APPROVED', v.created_at, v.created_at
FROM users u
CROSS JOIN (VALUES
  ('ae000001-deed-0000-0000-000000000002'::uuid, 'c0000001-deed-0000-0000-000000000001'::uuid, 'a0000002-deed-0000-0000-000000000001'::uuid, 'b0000001-deed-0000-0000-000000000001'::uuid, 'e1000001-deed-0000-0000-000000000002'::uuid, 5::int, 'Excellent overnight journey',       'Very comfortable sleeper seats. Blankets provided. Driver was courteous and on time. Will definitely book again!',          '2026-04-15'::date, '2026-04-16 10:00:00+00'::timestamptz),
  ('ae000002-deed-0000-0000-000000000002'::uuid, 'c0000001-deed-0000-0000-000000000001'::uuid, 'a0000002-deed-0000-0000-000000000001'::uuid, 'b0000002-deed-0000-0000-000000000001'::uuid, 'e1000002-deed-0000-0000-000000000002'::uuid, 4::int, 'Good trip, minor delay',            'AC was refreshing and the seating was comfortable. Bus arrived about 20 minutes late but the overall experience was good.', '2026-04-28'::date, '2026-04-29 09:00:00+00'::timestamptz),
  ('ae000003-deed-0000-0000-000000000002'::uuid, 'c0000002-deed-0000-0000-000000000001'::uuid, 'a0000002-deed-0000-0000-000000000001'::uuid, 'b0000003-deed-0000-0000-000000000001'::uuid, 'e1000003-deed-0000-0000-000000000002'::uuid, 3::int, 'Decent but could be better',        'Bus was slightly late and legroom was tight. Driver was okay. The Lonavala stretch is scenic though.',                     '2026-05-03'::date, '2026-05-03 12:00:00+00'::timestamptz),
  ('ae000004-deed-0000-0000-000000000002'::uuid, 'c0000003-deed-0000-0000-000000000001'::uuid, 'a0000002-deed-0000-0000-000000000001'::uuid, 'b0000001-deed-0000-0000-000000000001'::uuid, 'e1000004-deed-0000-0000-000000000002'::uuid, 5::int, 'Smooth ride, highly recommended', 'Perfectly on time. Smooth highway drive to Jaipur. Rest stop at Behror was clean. Would recommend TripGo to everyone!',    '2026-05-12'::date, '2026-05-12 09:00:00+00'::timestamptz)
) v(id, route_id, operator_id, bus_id, route_schedule_id, rating, title, comment, travel_date, created_at)
WHERE u.email = 'tripgo.user@yopmail.com'
ON CONFLICT (id) DO NOTHING;
