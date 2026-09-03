CREATE INDEX IF NOT EXISTS idx_bookings_schedule_status_date ON bookings(route_schedule_id, status, travel_date);
CREATE INDEX IF NOT EXISTS idx_route_segments_route_seq      ON route_segments(route_id, seq);
CREATE INDEX IF NOT EXISTS idx_seat_locks_token              ON seat_locks(lock_token);
