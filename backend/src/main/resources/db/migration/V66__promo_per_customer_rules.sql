-- Per-customer promo rules. usage_limit caps a code across everyone; these cap it per traveller.
ALTER TABLE discounts ADD COLUMN per_customer_limit INTEGER;
ALTER TABLE discounts ADD COLUMN first_booking_only BOOLEAN NOT NULL DEFAULT false;

-- FIRST50 is advertised as "your very first bus booking"
UPDATE discounts SET first_booking_only = true, per_customer_limit = 1 WHERE code = 'FIRST50';
