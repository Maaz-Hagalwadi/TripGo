ALTER TABLE users ADD COLUMN referral_code VARCHAR(10) UNIQUE;
ALTER TABLE users ADD COLUMN referred_by  UUID REFERENCES users(id);

-- Generate a unique 8-char code for every existing user
UPDATE users
SET referral_code = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

CREATE TABLE referral_rewards (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id      UUID NOT NULL REFERENCES users(id),
    referred_id      UUID NOT NULL UNIQUE REFERENCES users(id),
    booking_id       UUID REFERENCES bookings(id),
    status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_referral_rewards_referrer ON referral_rewards(referrer_id);
