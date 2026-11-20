CREATE TABLE site_visits (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id    VARCHAR(64)  NOT NULL,
    session_id    VARCHAR(64),
    user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    path          VARCHAR(255) NOT NULL,
    referrer      VARCHAR(255),
    utm_source    VARCHAR(100),
    utm_medium    VARCHAR(100),
    utm_campaign  VARCHAR(100),
    screen_width  INTEGER,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_site_visits_created ON site_visits (created_at DESC);
CREATE INDEX idx_site_visits_user    ON site_visits (user_id) WHERE user_id IS NOT NULL;
