-- Existing fares were created before per-bus pricing was added
-- Reset them to route-level (bus_id = NULL) so they apply to all buses
UPDATE fares SET bus_id = NULL WHERE bus_id IS NOT NULL;
