CREATE TABLE route_alerts (
    id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id                 UUID NOT NULL REFERENCES users(id),
    from_stop               VARCHAR(255) NOT NULL,
    to_stop                 VARCHAR(255) NOT NULL,
    travel_date             DATE NOT NULL,
    target_fare             DECIMAL(10, 2),
    alert_on_seat_available BOOLEAN NOT NULL DEFAULT false,
    active                  BOOLEAN NOT NULL DEFAULT true,
    last_notified_at        TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_route_alerts_user_id ON route_alerts(user_id);
CREATE INDEX idx_route_alerts_active_date ON route_alerts(active, travel_date);
