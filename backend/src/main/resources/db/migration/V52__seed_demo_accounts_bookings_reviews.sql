-- =============================================================
-- V52: Demo accounts + 10 bookings + 4 reviews
-- Accounts  (password for all: TripGo@2026)
--   USER     → tripgo.user@yopmail.com
--   OPERATOR → tripgo.operator@yopmail.com  (linked to TripGo Travels)
--   ADMIN    → tripgo.admin@yopmail.com
-- =============================================================

-- ── 1. USERS ─────────────────────────────────────────────────

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

INSERT INTO user_roles (user_id, role_id)
SELECT 'f1000001-deed-0000-0000-000000000002', id
FROM roles WHERE name = 'ROLE_USER'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'f2000001-deed-0000-0000-000000000002', id
FROM roles WHERE name = 'ROLE_OPERATOR'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'f3000001-deed-0000-0000-000000000002', id
FROM roles WHERE name = 'ROLE_ADMIN'
ON CONFLICT DO NOTHING;

-- Link operator user to existing TripGo Travels operator
UPDATE users
SET    operator_id = 'a0000002-deed-0000-0000-000000000001'
WHERE  id          = 'f2000001-deed-0000-0000-000000000002'
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

-- ── 3. PASSENGERS ────────────────────────────────────────────

INSERT INTO passengers (id, user_id, first_name, last_name,
                        age, gender, phone, id_type, id_no, created_at)
VALUES
  ('ab000001-deed-0000-0000-000000000002', 'f1000001-deed-0000-0000-000000000002', 'TripGo', 'User', 28, 'MALE', '+91-9900001001', 'AADHAAR', '1234-5678-9001', now()),
  ('ab000002-deed-0000-0000-000000000002', 'f1000001-deed-0000-0000-000000000002', 'TripGo', 'User', 28, 'MALE', '+91-9900001001', 'AADHAAR', '1234-5678-9001', now()),
  ('ab000003-deed-0000-0000-000000000002', 'f1000001-deed-0000-0000-000000000002', 'TripGo', 'User', 28, 'MALE', '+91-9900001001', 'AADHAAR', '1234-5678-9001', now()),
  ('ab000004-deed-0000-0000-000000000002', 'f1000001-deed-0000-0000-000000000002', 'TripGo', 'User', 28, 'MALE', '+91-9900001001', 'AADHAAR', '1234-5678-9001', now()),
  ('ab000005-deed-0000-0000-000000000002', 'f1000001-deed-0000-0000-000000000002', 'TripGo', 'User', 28, 'MALE', '+91-9900001001', 'AADHAAR', '1234-5678-9001', now()),
  ('ab000006-deed-0000-0000-000000000002', 'f1000001-deed-0000-0000-000000000002', 'TripGo', 'User', 28, 'MALE', '+91-9900001001', 'AADHAAR', '1234-5678-9001', now()),
  ('ab000007-deed-0000-0000-000000000002', 'f1000001-deed-0000-0000-000000000002', 'TripGo', 'User', 28, 'MALE', '+91-9900001001', 'AADHAAR', '1234-5678-9001', now()),
  ('ab000008-deed-0000-0000-000000000002', 'f1000001-deed-0000-0000-000000000002', 'TripGo', 'User', 28, 'MALE', '+91-9900001001', 'AADHAAR', '1234-5678-9001', now()),
  ('ab000009-deed-0000-0000-000000000002', 'f1000001-deed-0000-0000-000000000002', 'TripGo', 'User', 28, 'MALE', '+91-9900001001', 'AADHAAR', '1234-5678-9001', now()),
  ('ab00000a-deed-0000-0000-000000000002', 'f1000001-deed-0000-0000-000000000002', 'TripGo', 'User', 28, 'MALE', '+91-9900001001', 'AADHAAR', '1234-5678-9001', now())
ON CONFLICT (id) DO NOTHING;

-- ── 4. BOOKINGS ──────────────────────────────────────────────
-- Fares (base + 5% GST):
--   HYD→BLR LOWER  850.00 + 42.50 = 892.50
--   HYD→BLR SEATER 610.00 + 30.50 = 640.50
--   MUM→PNE SEATER 350.00 + 17.50 = 367.50
--   DEL→JAI LOWER  720.00 + 36.00 = 756.00

INSERT INTO bookings (id, user_id, route_schedule_id, operator_id,
                      total_amount, gst_amount, discount_amount, payable_amount,
                      status, booking_code, travel_date,
                      created_at, updated_at)
VALUES
  -- 1. COMPLETED: HYD→BLR Apr 15, Bus 1, seat L3
  ('bb000001-deed-0000-0000-000000000002',
   'f1000001-deed-0000-0000-000000000002',
   'e1000001-deed-0000-0000-000000000002',
   'a0000002-deed-0000-0000-000000000001',
   850.00, 42.50, 0.00, 892.50,
   'COMPLETED', 'BB000001', '2026-04-15',
   '2026-04-14 18:00:00+00', '2026-04-16 07:00:00+00'),

  -- 2. COMPLETED: HYD→BLR Apr 28, Bus 2, seat A5
  ('bb000002-deed-0000-0000-000000000002',
   'f1000001-deed-0000-0000-000000000002',
   'e1000002-deed-0000-0000-000000000002',
   'a0000002-deed-0000-0000-000000000001',
   610.00, 30.50, 0.00, 640.50,
   'COMPLETED', 'BB000002', '2026-04-28',
   '2026-04-27 12:00:00+00', '2026-04-29 02:00:00+00'),

  -- 3. COMPLETED: MUM→PNE May 3, Bus 3, seat A2
  ('bb000003-deed-0000-0000-000000000002',
   'f1000001-deed-0000-0000-000000000002',
   'e1000003-deed-0000-0000-000000000002',
   'a0000002-deed-0000-0000-000000000001',
   350.00, 17.50, 0.00, 367.50,
   'COMPLETED', 'BB000003', '2026-05-03',
   '2026-05-02 20:00:00+00', '2026-05-03 06:00:00+00'),

  -- 4. COMPLETED: DEL→JAI May 12, Bus 1, seat L4
  ('bb000004-deed-0000-0000-000000000002',
   'f1000001-deed-0000-0000-000000000002',
   'e1000004-deed-0000-0000-000000000002',
   'a0000002-deed-0000-0000-000000000001',
   720.00, 36.00, 0.00, 756.00,
   'COMPLETED', 'BB000004', '2026-05-12',
   '2026-05-11 15:00:00+00', '2026-05-12 08:00:00+00'),

  -- 5. COMPLETED: HYD→BLR May 20, Bus 1, seat L7 (no review)
  ('bb000005-deed-0000-0000-000000000002',
   'f1000001-deed-0000-0000-000000000002',
   'e1000005-deed-0000-0000-000000000002',
   'a0000002-deed-0000-0000-000000000001',
   850.00, 42.50, 0.00, 892.50,
   'COMPLETED', 'BB000005', '2026-05-20',
   '2026-05-19 14:00:00+00', '2026-05-21 02:00:00+00'),

  -- 6. CONFIRMED: HYD→BLR Jun 1, Bus 1, seat L9
  ('bb000006-deed-0000-0000-000000000002',
   'f1000001-deed-0000-0000-000000000002',
   'e0000001-deed-0000-0000-000000000001',
   'a0000002-deed-0000-0000-000000000001',
   850.00, 42.50, 0.00, 892.50,
   'CONFIRMED', 'BB000006', '2026-06-01',
   now(), now()),

  -- 7. CONFIRMED: MUM→PNE Jun 1 07:00, Bus 3, seat A4
  ('bb000007-deed-0000-0000-000000000002',
   'f1000001-deed-0000-0000-000000000002',
   'e0000009-deed-0000-0000-000000000001',
   'a0000002-deed-0000-0000-000000000001',
   350.00, 17.50, 0.00, 367.50,
   'CONFIRMED', 'BB000007', '2026-06-01',
   now(), now()),

  -- 8. CONFIRMED: DEL→JAI Jun 1, Bus 1, seat L11
  ('bb000008-deed-0000-0000-000000000002',
   'f1000001-deed-0000-0000-000000000002',
   'e0000015-deed-0000-0000-000000000001',
   'a0000002-deed-0000-0000-000000000001',
   720.00, 36.00, 0.00, 756.00,
   'CONFIRMED', 'BB000008', '2026-06-01',
   now(), now()),

  -- 9. CANCELLED: HYD→BLR Jun 2, Bus 2, seat A7
  ('bb000009-deed-0000-0000-000000000002',
   'f1000001-deed-0000-0000-000000000002',
   'e0000002-deed-0000-0000-000000000001',
   'a0000002-deed-0000-0000-000000000001',
   610.00, 30.50, 0.00, 640.50,
   'CANCELLED', 'BB000009', '2026-06-02',
   now(), now()),

  -- 10. CANCELLED: MUM→PNE Jun 1 14:00, Bus 3, seat B3
  ('bb00000a-deed-0000-0000-000000000002',
   'f1000001-deed-0000-0000-000000000002',
   'e0000010-deed-0000-0000-000000000001',
   'a0000002-deed-0000-0000-000000000001',
   350.00, 17.50, 0.00, 367.50,
   'CANCELLED', 'BB00000A', '2026-06-01',
   now(), now())

ON CONFLICT (id) DO NOTHING;

-- Cancellation metadata
UPDATE bookings
SET cancelled_by   = 'USER',
    cancel_reason  = 'Change of plans',
    cancelled_at   = now(),
    refund_amount  = payable_amount,
    refund_status  = 'REFUNDED'
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
  ('ac000001-deed-0000-0000-000000000002', 'bb000001-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb000001', 892.50, 'SUCCEEDED', '2026-04-14 18:30:00+00'),
  ('ac000002-deed-0000-0000-000000000002', 'bb000002-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb000002', 640.50, 'SUCCEEDED', '2026-04-27 12:30:00+00'),
  ('ac000003-deed-0000-0000-000000000002', 'bb000003-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb000003', 367.50, 'SUCCEEDED', '2026-05-02 20:30:00+00'),
  ('ac000004-deed-0000-0000-000000000002', 'bb000004-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb000004', 756.00, 'SUCCEEDED', '2026-05-11 15:30:00+00'),
  ('ac000005-deed-0000-0000-000000000002', 'bb000005-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb000005', 892.50, 'SUCCEEDED', '2026-05-19 14:30:00+00'),
  ('ac000006-deed-0000-0000-000000000002', 'bb000006-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb000006', 892.50, 'SUCCEEDED', now()),
  ('ac000007-deed-0000-0000-000000000002', 'bb000007-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb000007', 367.50, 'SUCCEEDED', now()),
  ('ac000008-deed-0000-0000-000000000002', 'bb000008-deed-0000-0000-000000000002', 'STRIPE', 'pi_demo_bb000008', 756.00, 'SUCCEEDED', now()),
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

-- ── 8. REVIEWS (for 4 of the 5 completed trips) ──────────────

INSERT INTO reviews (id, user_id, route_id, operator_id, bus_id, route_schedule_id,
                     rating, title, comment, travel_date,
                     hidden, moderation_status, created_at, updated_at)
VALUES
  ('ae000001-deed-0000-0000-000000000002',
   'f1000001-deed-0000-0000-000000000002',
   'c0000001-deed-0000-0000-000000000001',
   'a0000002-deed-0000-0000-000000000001',
   'b0000001-deed-0000-0000-000000000001',
   'e1000001-deed-0000-0000-000000000002',
   5, 'Excellent overnight journey',
   'Very comfortable sleeper seats. Blankets provided. Driver was courteous and on time. Will definitely book again!',
   '2026-04-15', false, 'APPROVED',
   '2026-04-16 10:00:00+00', '2026-04-16 10:00:00+00'),

  ('ae000002-deed-0000-0000-000000000002',
   'f1000001-deed-0000-0000-000000000002',
   'c0000001-deed-0000-0000-000000000001',
   'a0000002-deed-0000-0000-000000000001',
   'b0000002-deed-0000-0000-000000000001',
   'e1000002-deed-0000-0000-000000000002',
   4, 'Good trip, minor delay',
   'AC was refreshing and the seating was comfortable. Bus arrived about 20 minutes late but the overall experience was good.',
   '2026-04-28', false, 'APPROVED',
   '2026-04-29 09:00:00+00', '2026-04-29 09:00:00+00'),

  ('ae000003-deed-0000-0000-000000000002',
   'f1000001-deed-0000-0000-000000000002',
   'c0000002-deed-0000-0000-000000000001',
   'a0000002-deed-0000-0000-000000000001',
   'b0000003-deed-0000-0000-000000000001',
   'e1000003-deed-0000-0000-000000000002',
   3, 'Decent but could be better',
   'Bus was slightly late and legroom was tight. Driver was okay. The Lonavala stretch is scenic though.',
   '2026-05-03', false, 'APPROVED',
   '2026-05-03 12:00:00+00', '2026-05-03 12:00:00+00'),

  ('ae000004-deed-0000-0000-000000000002',
   'f1000001-deed-0000-0000-000000000002',
   'c0000003-deed-0000-0000-000000000001',
   'a0000002-deed-0000-0000-000000000001',
   'b0000001-deed-0000-0000-000000000001',
   'e1000004-deed-0000-0000-000000000002',
   5, 'Smooth ride, highly recommended',
   'Perfectly on time. Smooth highway drive to Jaipur. Rest stop at Behror was clean. Would recommend TripGo to everyone!',
   '2026-05-12', false, 'APPROVED',
   '2026-05-12 09:00:00+00', '2026-05-12 09:00:00+00')

ON CONFLICT (id) DO NOTHING;
