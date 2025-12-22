INSERT INTO roles (id, name) VALUES
(gen_random_uuid(), 'ROLE_USER'),
(gen_random_uuid(), 'ROLE_ADMIN'),
(gen_random_uuid(), 'ROLE_OPERATOR')
ON CONFLICT (name) DO NOTHING;
