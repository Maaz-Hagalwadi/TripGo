CREATE TABLE trip_share_tokens (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token       UUID NOT NULL UNIQUE,
    booking_id  UUID NOT NULL REFERENCES bookings(id),
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_trip_share_tokens_booking ON trip_share_tokens(booking_id);
