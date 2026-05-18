INSERT INTO discounts (code, description, type, value, max_discount, min_order_amount, usage_limit, used_count, valid_from, valid_to, active)
VALUES
  ('FIRST50',    'New to TripGo? Get flat 50% off on your very first bus booking.',             'PERCENT', 50, 200, 100,  500,  0, '2026-01-01', '2026-12-31', true),
  ('TRIPGO20',   'Travel on weekends and save 20% on any route, any operator.',                 'PERCENT', 20, 150, NULL, NULL, 0, '2026-01-01', '2026-12-31', true),
  ('PREMIUM15',  'Exclusive savings for TripGo subscribers on all bookings.',                   'PERCENT', 15, 100, NULL, NULL, 0, '2026-01-01', '2026-12-31', true),
  ('EARLYBIRD25','Book any trip and save 25% on your fare with this early bird deal.',          'PERCENT', 25, 300, 200,  1000, 0, '2026-01-01', '2026-12-31', true),
  ('GROUPSAVE10','Travelling with family or friends? Save 10% when booking 4 or more seats.',  'PERCENT', 10, 200, 500,  NULL, 0, '2026-01-01', '2026-12-31', true),
  ('REFER30',    'Share TripGo with a friend and both of you get 30% off your next trip.',     'PERCENT', 30, 250, 150,  2000, 0, '2026-01-01', '2026-12-31', true)
ON CONFLICT (code) DO NOTHING;
