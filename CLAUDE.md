# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TripGo is a full-stack bus booking platform with three user roles: **USER**, **OPERATOR**, and **ADMIN**. The repo is a monorepo with a Java Spring Boot backend and a React/Vite frontend.

## Repository Structure

```
/backend                  - Spring Boot 3.5.7 + Java 21 REST API (port 8080)
/frontend/TripGo-frontend - React 19 + Vite 7 SPA (port 5173)
/docs                     - Documentation
Dockerfile                - Multi-stage backend Docker build
```

## Commands

### Frontend (`frontend/TripGo-frontend`)
```bash
npm install       # Install dependencies
npm run dev       # Dev server at http://localhost:5173
npm run build     # Production build to /dist
npm run lint      # ESLint check
npm run preview   # Preview production build
```

### Backend (`backend`)
```bash
docker-compose up -d                       # Start PostgreSQL (required first)
./mvnw spring-boot:run                     # Run dev server at http://localhost:8080
./mvnw clean package -DskipTests           # Build JAR
./mvnw test                                # Run all tests (test dir is currently empty)
./mvnw test -Dtest=ClassName#methodName    # Run a single test method
```

Backend also has a `./run.sh` script. Requires a `.env` file — see `backend/SETUP.md`.

## Architecture

### Frontend

**Routing & Auth:**
- React Router v6 with 50+ lazy-loaded routes via `lazy()` + `Suspense` (fallback: `TripGoLoader`)
- `ProtectedRoute` component enforces role-based access (`USER`, `OPERATOR`, `ADMIN`)
- Route constants in `src/shared/constants/routes.js`

**State:**
- `AuthContext` — auth state, proactive token refresh (2 min before expiry), role checks, operator suspension detection (polls `/auth/me` every 30 s)
- `ThemeContext` — dark/light mode
- `BusWizardContext` — multi-step bus creation wizard; state persisted to `sessionStorage` under key `busWizard`, wraps only the `/operator/add-bus`, `/operator/bus-layout`, `/operator/bus-review` routes
- Tokens stored in `localStorage` as `accessToken` / `refreshToken`

**API layer (`src/api/apiClient.js`):**
- `fetchWithAuth()` wraps all authenticated requests
- Exports `apiGet()`, `apiPost()`, `apiPut()`, `apiPatch()`, `apiDelete()`
- Auto-refreshes on 401, deduplicates concurrent refresh calls, retries the original request
- Parses JWT payload via `atob()` to schedule proactive refresh
- Base URL set via `VITE_API_BASE_URL` (defaults to `http://localhost:8080`)

**UI stack:** Tailwind CSS 3 + MUI 7 + Emotion. Toast notifications via Sonner. Forms via React Hook Form + Zod (schemas in `src/shared/schemas/`).

**Payments:** Stripe (`@stripe/react-stripe-js`). Key via `VITE_STRIPE_PUBLISHABLE_KEY`.

### Backend

**Package layout (`com.tripgo.backend`):**
- `controller/` — REST endpoints (20+ controllers)
- `service/impl/` — primary business logic implementations
- `service2/` — secondary/supporting services (e.g. PDF, QR, S3 upload)
- `repository/` — 31 `JpaRepository<Entity, UUID>` interfaces
- `model/entities/` — 32 JPA entities (all UUIDs as PKs, Lombok)
- `model/enums/` — `RoleType`, `BookingStatus`, `SeatType`, etc.
- `dto/` — `request/` and `response/` DTOs
- `security/` — JWT filter chain, OAuth2 handler, rate limiter
- `exception/handler/GlobalExceptionHandler.java` — `@RestControllerAdvice` returns `ApiError` (timestamp, status, message, path)

**Security filter chain:**
1. `RateLimitFilter` (Bucket4j) → `JwtAuthenticationFilter` → Spring Security
2. Stateless JWT; access tokens expire in 15 min, refresh tokens in 14 days
3. Token extracted from `ACCESS_TOKEN` cookie first, then `Authorization: Bearer` header
4. Public endpoints: `/auth/**`, `/search/**`, `/amenities/**`, `/payments/webhook`, `/ws/**`, `/booking/schedules/*/route-stops|policies|features`
5. Role enforcement via `@PreAuthorize` on controllers
6. Google OAuth2 at `/login/oauth2/code/google` with custom `OAuth2SuccessHandler`
7. CORS origins read from `CORS_ALLOWED_ORIGINS` env var

**Database:**
- PostgreSQL 13 via HikariCP (max 10 connections)
- **41 Flyway migrations** (V1–V41) manage the full schema — never edit the DB directly, always add a new migration
- Key domain tables: `users`, `operators`, `buses`, `routes`, `route_schedules`, `bookings`, `booking_seats`, `payments`, `tickets`, `ratings`
- Seat availability is tracked per date and route segment
- `seat_locks` table prevents double-booking: seats are locked with an expiry during checkout and released on payment confirmation or timeout

**Operator lifecycle:**
- Operators register → status `PENDING` → Admin approves/rejects via `/admin/**`
- Suspended operators are detected on the frontend via the 30 s polling loop in `AuthContext`

**Key integrations:**
- **Stripe** (Java SDK 24) — payment intents + webhook processing
- **iText7** — PDF ticket generation (async via `@Async`)
- **Zxing** — QR code embedding in tickets
- **AWS S3 SDK v2** — stores generated ticket PDFs; download URL saved in `Ticket` entity
- **Spring Mail** + Thymeleaf templates — email notifications (verification, tickets, password reset)
- **Spring WebSocket** (`/ws/**`) — real-time admin/operator notifications; also persisted in `Notification` table

**Backend API shape:**
- `/auth/**` — register, login, refresh, OTP, OAuth, email verification, password reset
- `/search/**` — bus/route search (public)
- `/booking/**` — seat locking, booking creation, schedule details, policies, cancellation
- `/payments/**` — Stripe payment intent + webhook
- `/operator/**` — operator dashboard (buses, routes, schedules, drivers)
- `/admin/**` — admin operations (operator approval, bus moderation, user management)
- `/buses/*/rating-summary`, `/amenities/**` — public data

**Known configuration note:** `backend/src/main/resources/application.yml` currently has Google OAuth2 credentials hardcoded instead of reading from env vars. New OAuth-related config should be added via env vars and `application.properties` instead.

## Environment Variables

**Frontend** (`.env` in `frontend/TripGo-frontend`):
```
VITE_API_BASE_URL=http://localhost:8080
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Backend** (`.env` in `backend`):
See `backend/SETUP.md` for required variables (DB credentials, JWT secret, Stripe secret, Google OAuth, mail config, AWS S3, CORS origins).

## Deployment

- **Frontend:** Vercel (`vercel.json` present); all routes rewrite to `/index.html` for SPA behavior.
- **Backend:** Docker (`Dockerfile`) — Maven build stage → JRE 21 runtime image, exposes 8080.
