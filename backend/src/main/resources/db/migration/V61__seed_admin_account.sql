-- V61: Admin account for tripgo.admin@yopmail.com
-- Password: TripGo@2026

INSERT INTO users (id, first_name, last_name, email, password,
                   is_email_verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'TripGo', 'Admin',
  'tripgo.admin@yopmail.com',
  crypt('TripGo@2026', gen_salt('bf', 10)),
  true, now(), now()
) ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM   users u, roles r
WHERE  u.email = 'tripgo.admin@yopmail.com'
AND    r.name  = 'ROLE_ADMIN'
ON CONFLICT DO NOTHING;
