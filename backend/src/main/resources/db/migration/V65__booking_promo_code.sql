-- The promo code a booking was paid with, so its usage is counted once the booking is confirmed.
ALTER TABLE bookings ADD COLUMN promo_code VARCHAR(50);
