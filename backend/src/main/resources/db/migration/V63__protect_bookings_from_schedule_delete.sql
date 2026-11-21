-- Deleting a schedule (or a route, which deletes its schedules) used to CASCADE to bookings, silently
-- erasing travellers' paid tickets and the operator's booking history. Bookings must outlive any
-- attempt to remove their schedule: the delete is now refused while bookings exist.
ALTER TABLE bookings DROP CONSTRAINT bookings_route_schedule_id_fkey;
ALTER TABLE bookings
    ADD CONSTRAINT bookings_route_schedule_id_fkey
    FOREIGN KEY (route_schedule_id) REFERENCES route_schedules(id) ON DELETE RESTRICT;
