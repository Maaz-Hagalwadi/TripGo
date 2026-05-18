-- Missing indexes identified for query performance

CREATE INDEX IF NOT EXISTS idx_bookings_travel_date        ON bookings(travel_date);
CREATE INDEX IF NOT EXISTS idx_bookings_operator_status    ON bookings(operator_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_status             ON payments(status);
CREATE INDEX IF NOT EXISTS idx_seat_locks_expiry           ON seat_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_seat_locks_schedule_date    ON seat_locks(route_schedule_id, travel_date);
CREATE INDEX IF NOT EXISTS idx_route_schedule_active       ON route_schedules(trip_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user          ON notifications(user_id);
