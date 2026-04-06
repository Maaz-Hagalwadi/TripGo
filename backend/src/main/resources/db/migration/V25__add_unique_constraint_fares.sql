ALTER TABLE fares
ADD CONSTRAINT uq_fare_segment_seattype UNIQUE (route_segment_id, seat_type);