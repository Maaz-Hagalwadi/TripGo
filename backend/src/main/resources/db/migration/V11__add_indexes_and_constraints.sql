-- Indexes for fast search
CREATE INDEX idx_routes_origin_destination ON routes (origin, destination);
CREATE INDEX idx_route_schedule_departure ON route_schedules (departure_time);
CREATE INDEX idx_buses_operator ON buses (operator_id);
CREATE INDEX idx_bookings_user ON bookings (user_id);
CREATE INDEX idx_bookings_status ON bookings (status);

-- Unique constraints / helpful constraints
ALTER TABLE tickets ADD CONSTRAINT uq_ticket_no UNIQUE (ticket_no);
