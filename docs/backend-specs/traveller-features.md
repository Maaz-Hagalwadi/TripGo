# Traveller features — backend spec

The frontend for every feature below is already built. Features that need new endpoints are
**switched off** until you enable their flag in `frontend/TripGo-frontend/.env`:

| Flag | Feature | Section |
|---|---|---|
| — (works when `busId` is added) | Ratings on search results | §1 |
| — (works when `bookedByFemale` is added) | "Booked by a woman" seats | §2 |
| `VITE_FEATURE_LIVE_SHARE=true` | Live trip share links | §4 |
| `VITE_FEATURE_ROUTE_ALERTS=true` | Seat & price alerts | §5 |
| `VITE_FEATURE_WALLET=true` | TripGo credit & instant refunds | §7 |
| `VITE_FEATURE_REFERRALS=true` | Referrals | §8 |
| `VITE_FEATURE_VISIT_TRACKING=true` | Visitor analytics (Audit logs → Visitors) | §11 |

Already working with the existing backend (no changes needed): §3 boarding/drop points on search,
§4 sharing trip details as text, §6 trip-day mode, §9 "book return" round-trip flow.

Conventions used below match the codebase: response DTOs are records, request DTOs use Lombok +
Jakarta validation, errors use `BadRequestException` (400) so the frontend can show the message,
and every schema change is a new Flyway migration (next free number: **V57** (V56 is the IST travel-date fix)).

---

## §1 Ratings on search results

**Change:** add the bus id to each search result.

`GET /search?from=&to=&date=` — add one field to `SearchResponse`:

```json
{ "scheduleId": "…", "busId": "b0000001-…", "busName": "…", … }
```

The frontend then calls the existing public `GET /buses/{busId}/rating-summary` once per bus
(cached) and shows `★ 4.3 · 120 reviews`, or `New` when `totalRatings` is 0.

*Optional optimisation:* include `averageRating` and `totalRatings` directly in `SearchResponse`
(one grouped query over `reviews` for the buses in the result) to avoid the extra calls. If you do,
tell me and I'll read them from the search response instead.

---

## §2 "Booked by a woman" seats

**Change:** one boolean per seat in the seat map.

`GET /booking/schedules/{scheduleId}/seats` — add to each seat map in `BookingController`:

```json
{ "seatNumber": "L4", "available": false, "bookedByFemale": true, … }
```

Rules:
- `true` only when the seat is **booked** (confirmed booking overlapping the requested segment —
  the same `confirmedSeats` + `segmentsOverlap` check already used for `isBooked`) **and** that
  booking seat's passenger gender is female (compare case-insensitively: `Female` / `FEMALE`).
- `false` for available, locked or blocked seats.
- Expose only this boolean — never the passenger's name or other details.

### Enforce "seat next to a woman is for women only"

The frontend already marks these seats pink and blocks male travellers on them, but the server must
enforce it too (a request can skip the UI). In `PaymentController.createIntent`, before creating the
booking, reject any passenger whose gender is not female on a seat that is either:
- `isLadiesOnly`, or
- directly beside a seat with a confirmed booking by a female passenger (overlapping the segment) —
  "beside" = same deck and row, adjacent column, same side of the aisle.

Seat positions follow the two numbering schemes in use (see `src/features/search/utils/seatLayout.js`):
- berths `L1`/`U1`: 3 per row, `row = (n-1)/3`, `col = (n-1)%3`; the aisle is after column 0, so only
  columns 1 and 2 are neighbours;
- seats `1A` / `A1`: row = number, column = letter (A=0…); with 4 columns the aisle is after column 1
  (pairs A–B and C–D), with 3 columns after column 0 (pair B–C).

Throw `BadRequestException("Seat L2 is next to a woman traveller and can only be booked for a woman")`
so the frontend shows the message. Travellers booked together in the same request are not restricted
by each other.

---

## §4 Live trip share links

Without the flag, "Share trip" already shares trip details as text. With it, a live link is added.

### Migration (V57)
```sql
CREATE TABLE trip_share_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token       VARCHAR(64) NOT NULL UNIQUE,      -- random, URL-safe (e.g. 32 bytes base64url)
    booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_trip_share_booking ON trip_share_tokens(booking_id);
```

### `POST /booking/{bookingId}/share` (authenticated, owner only)
- 404 if the booking doesn't belong to the caller; 400 if it's cancelled.
- Reuse an unexpired token for the booking if one exists; otherwise create one.
- `expires_at` = the trip's actual arrival (travel date + schedule arrival time) **+ 6 hours**.
- Response:
```json
{ "token": "x7Pq…", "url": "https://<FRONTEND_URL>/trip/x7Pq…", "expiresAt": "2026-11-21T03:20:00Z" }
```

### `GET /trip-share/{token}` (public — add `/trip-share/**` to `permitAll` in `SecurityConfig`)
- 404 when the token doesn't exist or is expired (frontend shows "This trip link has expired.").
- Response (no passenger contact details, seats or booking code):
```json
{
  "from": "Delhi", "to": "Jaipur",
  "busName": "Royal Express AC Sleeper", "busNumber": "RJ14 AB 1234",
  "departureTime": "2026-11-20T16:30:00Z", "arrivalTime": "2026-11-20T21:20:00Z",
  "tripStatus": "STARTED",
  "travellerFirstName": "Priya",
  "latitude": 26.91, "longitude": 75.78, "recordedAt": "2026-11-20T18:02:11Z"
}
```
  - Times: the trip's actual departure/arrival for the booking's travel date (same projection as search).
  - Location: latest row from `bus_tracking` for the schedule (`latitude`/`longitude` null when none yet).
- Rate-limit this path (e.g. 30 req/min per IP) — the page polls every 30 s.

---

## §5 Seat & price alerts on saved routes

### Migration (V58)
```sql
CREATE TABLE route_alerts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    saved_route_id    UUID REFERENCES user_saved_routes(id) ON DELETE CASCADE,
    from_city         VARCHAR(120) NOT NULL,
    to_city           VARCHAR(120) NOT NULL,
    travel_date       DATE,                      -- null = any of the next 7 days (fare alerts only)
    max_fare          NUMERIC(10,2),             -- null = no fare condition
    notify_on_seats   BOOLEAN NOT NULL DEFAULT false,
    active            BOOLEAN NOT NULL DEFAULT true,
    last_notified_at  TIMESTAMPTZ,
    last_seen_fare    NUMERIC(10,2),
    last_seen_seats   INTEGER,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_route_alerts_active ON route_alerts(active) WHERE active = true;
CREATE UNIQUE INDEX uq_route_alert_per_saved_route ON route_alerts(user_id, saved_route_id) WHERE active = true;
```

### Endpoints (authenticated)
| Method | Path | Body / response |
|---|---|---|
| GET | `/route-alerts` | `[{ id, savedRouteId, fromCity, toCity, travelDate, maxFare, notifyOnSeats, active, lastNotifiedAt }]` (active only) |
| POST | `/route-alerts` | body below → created alert |
| PUT | `/route-alerts/{id}` | body below → updated alert (owner only) |
| DELETE | `/route-alerts/{id}` | 204 (owner only; soft-delete = `active=false`) |

Request body:
```json
{ "savedRouteId": "uuid", "fromCity": "Delhi", "toCity": "Jaipur", "travelDate": "2026-11-28", "maxFare": 500, "notifyOnSeats": true }
```
Validation (400 with a readable message): at least one of `maxFare` / `notifyOnSeats`;
`travelDate` required when `notifyOnSeats`; `travelDate` not in the past; `maxFare` > 0;
max 10 active alerts per user.

### Checker job (`@Scheduled`, every 30 min)
For each active alert:
1. Dates to check: `travelDate`, or today…today+6 when null.
2. Run the same search the frontend uses (`/search` logic) for `fromCity → toCity` on each date.
3. **Fare condition:** cheapest `totalFare` across results ≤ `maxFare`.
   **Seat condition:** `notifyOnSeats` and any bus has `availableSeats > 0` **and** `last_seen_seats` was 0 (i.e. seats *opened up*).
4. If a condition is newly true, send one notification — `NotificationService` (in-app) + email —
   e.g. "Delhi → Jaipur on 28 Nov now from ₹480" with a link to `/search-results`.
5. Update `last_seen_fare`, `last_seen_seats`, `last_notified_at`. Don't notify the same alert again within 24 h
   unless the fare drops further.
6. Deactivate alerts whose `travelDate` has passed.

Make the job safe to run on several instances (same claim-once idea as `ScheduleRolloverService`, e.g. a
conditional `UPDATE … WHERE last_notified_at IS DISTINCT FROM …`).

---

## §6 Trip-day mode (optional extra)

Works today. Optional: add `operatorContactPhone` to `GET /booking/schedules/{id}/features` and the
card can show a "Call operator" button.

---

## §7 TripGo credit (wallet) & instant refunds

### Migration (V59)
```sql
CREATE TABLE wallets (
    user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE wallet_transactions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount       NUMERIC(10,2) NOT NULL,              -- + credit, − debit
    type         VARCHAR(30) NOT NULL,                -- REFUND | BOOKING_PAYMENT | REFERRAL_REWARD | ADJUSTMENT
    description  VARCHAR(200) NOT NULL,
    booking_id   UUID REFERENCES bookings(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_tx_user ON wallet_transactions(user_id, created_at DESC);
```

### `GET /wallet` (authenticated)
```json
{ "balance": 456.00, "transactions": [ { "id": "…", "amount": 456.00, "type": "REFUND", "description": "Refund for TG-8F3K2Q", "createdAt": "…" } ] }
```
Return a zero-balance wallet when none exists; last 20 transactions.

### Cancel with refund to credit
`POST /booking/{id}/cancel` — body already sends `{ "reason": "…" }`; with the flag it adds
`"refundTo": "CREDIT"` or `"ORIGINAL"` (default ORIGINAL when absent).

In `CancellationService` when `refundTo == CREDIT` and refund > 0:
- Credit the wallet (balance += refund, insert `REFUND` transaction) **in the same transaction** as the cancellation.
- **Skip** the Stripe refund; set `refundStatus = "PROCESSED"`.
- Operator/system cancellations always refund to the original payment method.

### Spending credit at checkout (backend + one more frontend step)
`POST /payments/create-intent` accepts `"useCredit": true`: reduce the amount charged by
`min(balance, payable)`; reserve it (debit with `BOOKING_PAYMENT`) when the booking is confirmed by the
webhook, and restore it if payment fails/expires. If credit covers the full amount, confirm the booking
without Stripe. **The checkout page doesn't send `useCredit` yet** — tell me when this endpoint is ready
and I'll add the "Use ₹456 TripGo credit" toggle to the payment page.

---

## §8 Referrals

### Migration (V60)
```sql
ALTER TABLE users ADD COLUMN referral_code VARCHAR(12) UNIQUE;
ALTER TABLE users ADD COLUMN referred_by UUID REFERENCES users(id);

CREATE TABLE referral_rewards (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id   UUID NOT NULL REFERENCES users(id),
    referee_id    UUID NOT NULL UNIQUE REFERENCES users(id),   -- a user can only be referred once
    booking_id    UUID REFERENCES bookings(id),
    reward_amount NUMERIC(10,2) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
Backfill codes for existing users (e.g. first 4 letters of first name + 4 random chars, uppercase).

### Registration
`POST /auth/register` — optional `"referralCode": "PRIY4K2D"` (already sent by the frontend when the flag is on;
invite links are `/register?ref=CODE`). Unknown code → 400 `referralCode: Invalid referral code`
(the field name prefix makes the form show it under the field). Own code / already-referred → ignore.

### Reward
When the referee's **first trip completes** (schedule `COMPLETED`, booking not cancelled), create a
`referral_rewards` row and credit **both** wallets (§7) — or, if you skip the wallet, issue each a promo code.
Use completion (not payment) so book-and-cancel can't farm rewards.

### `GET /referrals/me` (authenticated)
```json
{
  "code": "PRIY4K2D",
  "successfulReferrals": 3,
  "totalEarned": 300.00,
  "rewardText": "Get ₹100 credit for every friend who takes their first trip",
  "friendRewardText": "you get ₹100 off your first trip"
}
```

---

## §9 Round trips — combined payment (optional)

Today travellers book the return as a second booking ("Book return" on My bookings and on the payment
success page). A single combined payment would need a "booking group": lock both schedules' seats,
one PaymentIntent for the total, confirm or release both together. Only worth it if users ask for it.

---

## §10 Tickets on WhatsApp & SMS — cost notes ("Coming soon" in Settings)

Neither is free:
- **WhatsApp:** needs the WhatsApp Business Platform (Meta Cloud API directly, or a provider such as
  Twilio / Gupshup / Interakt). Meta charges per message by category; ticket/trip updates are
  **utility** messages, roughly ₹0.1–0.2 each in India (plus the provider's fee if you use one).
  Template messages must be pre-approved.
- **SMS (India):** requires **DLT registration** (sender ID + approved templates) with a telecom
  operator, then roughly ₹0.1–0.3 per SMS through a provider (MSG91, Gupshup, Twilio…).

Prices change — check the provider's current rate card before deciding.

---

## §11 Visitor analytics (Audit logs → Visitors)

The frontend sends one page view per route change (`src/shared/utils/visitTracker.js`) and shows
totals, top pages/sources and a "who visited" list in Audit logs → Visitors. It never sends events
for `/admin/**`, when the browser has Do Not Track on, or from automated browsers.

### Migration (V61)
```sql
CREATE TABLE site_visits (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id    VARCHAR(64)  NOT NULL,              -- random id kept in the visitor's browser
    session_id    VARCHAR(64),
    user_id       UUID REFERENCES users(id) ON DELETE SET NULL,  -- set only when the request is signed in
    path          VARCHAR(255) NOT NULL,
    referrer      VARCHAR(255),                       -- hostname only, e.g. google.com
    utm_source    VARCHAR(100),
    utm_medium    VARCHAR(100),
    utm_campaign  VARCHAR(100),
    screen_width  INTEGER,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_site_visits_created ON site_visits (created_at DESC);
CREATE INDEX idx_site_visits_user    ON site_visits (user_id) WHERE user_id IS NOT NULL;
```
Don't store IP addresses or the full user agent (the privacy policy now says so). Raw query strings
aren't sent either — only the UTM values above.

### `POST /analytics/visits` — public
Add `/analytics/visits` to the `permitAll` list. The JWT filter already runs on public routes, so a
signed-in request has an authenticated principal: take the user from it; never trust a user id or
email in the body.

```json
{ "path": "/search-results", "visitorId": "8c1f…", "sessionId": "e21a…", "screenWidth": 390,
  "utmSource": "linkedin-post", "utmMedium": "", "utmCampaign": "diwali", "referrer": "google.com" }
```
- Validate: `path` must start with `/`, max 255 chars, and must not start with `/admin`; `visitorId`
  required, max 64. Trim everything to the column sizes; store empty strings as `NULL`.
- Respond `204 No Content`. Never fail the page: on any error, log and still return 204.
- Rate limit: add a Bucket4j rule of ~60 req/min per IP for this path (the global 100/min also applies).
- Exclude it from `AuditLoggingAspect` (it's a public write and would flood the audit log).

### `GET /admin/visits/summary?days=7` — admin
`days` ∈ 1–90 (default 7), counted as IST calendar days ending today (use `AppTime.ZONE`).
```json
{
  "totalVisits": 408,
  "uniqueVisitors": 224,          // distinct visitor_id
  "signedInVisitors": 73,         // distinct user_id (non-null)
  "daily": [ { "date": "2026-11-14", "visits": 52, "uniqueVisitors": 31 }, … ],   // every day, zero-filled, oldest first
  "topPages":   [ { "path": "/", "visits": 171 }, … ],                              // top 10
  "topSources": [ { "source": "linkedin-post", "visits": 65 }, … ]                  // top 10
}
```
Source = `utm_source` if set, else `referrer`, else `"Direct"`.

### `GET /admin/visits?page=0&size=25&days=7&signedIn=true&email=priya` — admin
Newest first. `signedIn=true` keeps rows with a user; `email` is a case-insensitive partial match on
the user's email. Page shape matches audit logs (`content`, `totalElements`, `totalPages`).
```json
{ "content": [ {
    "id": "…", "createdAt": "2026-11-20T06:31:00Z", "path": "/booking",
    "visitorId": "a1b2c3d4…", "email": "priya@example.com", "userName": "Priya Sharma",
    "referrer": null, "utmSource": "linkedin-post", "utmCampaign": "diwali", "screenWidth": 390
  } ], "totalElements": 312, "totalPages": 13 }
```
`email` / `userName` are `null` for guests.

### Retention
Add a daily job to `LockScheduler` (or a new scheduler) that deletes `site_visits` older than
**180 days** — the privacy policy promises this.

