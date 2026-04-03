CREATE TABLE boarding_dropping_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES route_schedules(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('BOARDING', 'DROPPING')),
    address VARCHAR(500),
    arrival_time TIME,
    landmark VARCHAR(255)
);
