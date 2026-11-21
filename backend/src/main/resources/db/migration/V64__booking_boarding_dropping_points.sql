-- The boarding / dropping point a traveller picked at checkout, kept on the booking so operators get a
-- passenger manifest. Stored by value: daily departures recreate their point rows on every roll-over.
ALTER TABLE bookings ADD COLUMN boarding_point VARCHAR(255);
ALTER TABLE bookings ADD COLUMN boarding_time TIME;
ALTER TABLE bookings ADD COLUMN dropping_point VARCHAR(255);
ALTER TABLE bookings ADD COLUMN dropping_time TIME;
