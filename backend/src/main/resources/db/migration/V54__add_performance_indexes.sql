CREATE INDEX IF NOT EXISTS idx_booking_seats_schedule   ON booking_seats(route_schedule_id);
CREATE INDEX IF NOT EXISTS idx_route_segments_route_seq ON route_segments(route_id, seq);
CREATE INDEX IF NOT EXISTS idx_seat_locks_token         ON seat_locks(lock_token);
