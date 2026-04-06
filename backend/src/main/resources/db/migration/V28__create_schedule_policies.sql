CREATE TABLE schedule_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES route_schedules(id) ON DELETE CASCADE,

    -- Cancellation slabs (stored as JSON)
    cancellation_slabs JSONB NOT NULL DEFAULT '[
        {"hoursBeforeDeparture": 24, "refundPercent": 100, "label": "Before 24 hrs"},
        {"hoursBeforeDeparture": 12, "refundPercent": 50,  "label": "12-24 hrs before"},
        {"hoursBeforeDeparture": 4,  "refundPercent": 25,  "label": "4-12 hrs before"},
        {"hoursBeforeDeparture": 0,  "refundPercent": 0,   "label": "Less than 4 hrs"}
    ]',

    -- Date change rules
    date_change_allowed BOOLEAN NOT NULL DEFAULT true,
    date_change_fee_percent INTEGER NOT NULL DEFAULT 10,
    date_change_min_hours INTEGER NOT NULL DEFAULT 12,

    -- Rules
    luggage_policy VARCHAR(255) DEFAULT '1 bag up to 15kg allowed',
    children_policy VARCHAR(255) DEFAULT 'Children below 5 travel free',
    pets_allowed BOOLEAN NOT NULL DEFAULT false,
    liquor_allowed BOOLEAN NOT NULL DEFAULT false,
    smoking_allowed BOOLEAN NOT NULL DEFAULT false,
    pickup_notes VARCHAR(500),

    -- Rest stops (stored as JSON)
    rest_stops JSONB NOT NULL DEFAULT '[]',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(schedule_id)
);
