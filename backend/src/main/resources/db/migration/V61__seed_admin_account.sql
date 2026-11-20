-- V61: intentionally empty.
-- This migration used to insert an admin account with a hardcoded password. Credentials must not live
-- in the repository, so the first admin is now created from the ADMIN_EMAIL / ADMIN_PASSWORD environment
-- variables on startup (see config/AdminBootstrap.java). Kept as a no-op so the migration history stays valid.
SELECT 1;
