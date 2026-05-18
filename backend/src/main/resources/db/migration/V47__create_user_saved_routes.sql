CREATE TABLE user_saved_routes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_city   VARCHAR(255) NOT NULL,
    to_city     VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_saved_route_user UNIQUE (user_id, from_city, to_city)
);

CREATE INDEX idx_saved_routes_user_id ON user_saved_routes(user_id);
