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
docker-compose up -d          # Start PostgreSQL (required)
./mvnw spring-boot:run        # Run dev server at http://localhost:8080
./mvnw clean package -DskipTests  # Build JAR
./mvnw test                   # Run tests
```

Backend also has a `./run.sh` script. Requires a `.env` file — see `backend/SETUP.md`.

## Architecture

### Frontend

**Routing & Auth:**
- React Router v6 with lazy-loaded pages via `lazy()` + `Suspense`
- `ProtectedRoute` component enforces role-based access (`USER`, `OPERATOR`, `ADMIN`)
- Route constants in `src/shared/constants/routes.js`

**State:**
- `AuthContext` — auth state, token refresh (proactive, 2 min before expiry), role checks, suspension detection
- `ThemeContext` — dark/light mode
- `BusWizardContext` — multi-step bus creation wizard
- Tokens stored in `localStorage` as `accessToken` / `refreshToken`

**API layer (`src/shared/utils/apiClient.js`):**
- `fetchWithAuth()` wraps all authenticated requests
- Exports `apiGet()`, `apiPost()`, `apiPut()`, `apiPatch()`, `apiDelete()`
- Auto-refreshes on 401, retries the original request, handles 403/500+ globally
- Base URL set via `VITE_API_BASE_URL` (defaults to `http://localhost:8080`)

**UI stack:** Tailwind CSS 3 + MUI 7 + Emotion. Toast notifications via Sonner. Forms via React Hook Form + Zod.

**Payments:** Stripe (`@stripe/react-stripe-js`). Key via `VITE_STRIPE_PUBLISHABLE_KEY`.

### Backend

**Security filter chain:**
1. `RateLimitFilter` (Bucket4j) → `JwtAuthenticationFilter` → Spring Security
2. Stateless JWT sessions; access tokens expire in 15 min, refresh tokens in 14 days
3. Public endpoints: `/auth/**`, `/search/**`, `/amenities/**`, `/payments/webhook`
4. Role enforcement via `@PreAuthorize` on controllers
5. Google OAuth2 at `/login/oauth2/code/google` with custom `OAuth2SuccessHandler`
6. CORS origins read from `CORS_ALLOWED_ORIGINS` env var

**Database:**
- PostgreSQL 13 via HikariCP (max 10 connections)
- **41 Flyway migrations** (V1–V41) manage the full schema — never edit the DB directly, always add a new migration
- Key domain tables: `users`, `operators`, `buses`, `routes`, `route_schedules`, `bookings`, `booking_seats`, `payments`, `tickets`, `ratings`
- Seat availability is tracked per date and route segment

**Key integrations:**
- **Stripe** (Java SDK 24) — payments + webhook processing
- **iText7** — PDF ticket generation
- **Zxing** — QR code embedding in tickets
- **Spring Mail** + Thymeleaf templates — email notifications (verification, tickets, password reset)
- **Spring WebSocket** (`/ws/**`) — real-time updates

**Backend API shape:**
- `/auth/**` — register, login, refresh, OAuth
- `/search/**` — bus/route search (public)
- `/booking/**` — seat booking, schedule details, policies
- `/payments/**` — Stripe payment intent + webhook
- `/operator/**` — operator dashboard (buses, routes, schedules, drivers)
- `/admin/**` — admin operations (operator approval, moderation)
- `/buses/*/rating-summary`, `/amenities/**` — public data

## Environment Variables

**Frontend** (`.env` in `frontend/TripGo-frontend`):
```
VITE_API_BASE_URL=http://localhost:8080
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Backend** (`.env` in `backend`):
See `backend/SETUP.md` for required variables (DB credentials, JWT secret, Stripe secret, Google OAuth, mail config).

## Deployment

- **Frontend:** Vercel (`vercel.json` present); all routes rewrite to `/index.html` for SPA behavior.
- **Backend:** Docker (`Dockerfile`) — Maven build stage → JRE 21 runtime image, exposes 8080.
