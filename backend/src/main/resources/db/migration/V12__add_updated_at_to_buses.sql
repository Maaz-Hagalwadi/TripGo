-- Add updated_at to operators
ALTER TABLE operators
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add updated_at to drivers
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add updated_at to buses
ALTER TABLE buses
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE routes
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
