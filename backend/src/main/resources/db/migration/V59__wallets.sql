CREATE TABLE wallets (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID NOT NULL UNIQUE REFERENCES users(id),
    balance    DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE wallet_transactions (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id   UUID NOT NULL REFERENCES wallets(id),
    type        VARCHAR(10) NOT NULL,
    amount      DECIMAL(10, 2) NOT NULL,
    description VARCHAR(500),
    booking_id  UUID REFERENCES bookings(id),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
