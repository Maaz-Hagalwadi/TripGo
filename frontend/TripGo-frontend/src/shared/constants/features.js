// Feature switches read from Vite env vars ("true" turns a feature on).
// Features that need backend endpoints that don't exist yet stay off by default — see
// docs/backend-specs/traveller-features.md for the API each one expects.

const flag = (name) => import.meta.env[name] === 'true';

// Premium benefits aren't implemented in the backend yet, so memberships are closed and promos hidden.
// Enable together with the backend's PREMIUM_SALES_ENABLED once the benefits exist.
export const PREMIUM_SALES_ENABLED = flag('VITE_PREMIUM_SALES_ENABLED');

// Seat & price alerts on saved routes (spec §5)
export const ROUTE_ALERTS_ENABLED = flag('VITE_FEATURE_ROUTE_ALERTS');

// TripGo credit wallet + instant refunds to credit (spec §7)
export const WALLET_ENABLED = flag('VITE_FEATURE_WALLET');

// Referral codes and rewards (spec §8)
export const REFERRALS_ENABLED = flag('VITE_FEATURE_REFERRALS');

// Public live-trip share links (spec §4) — without it, "Share trip" shares the trip details as text
export const LIVE_SHARE_ENABLED = flag('VITE_FEATURE_LIVE_SHARE');

// Visitor analytics: page-view tracking + the Visitors tab in Audit logs (spec §11)
export const VISIT_TRACKING_ENABLED = flag('VITE_FEATURE_VISIT_TRACKING');
