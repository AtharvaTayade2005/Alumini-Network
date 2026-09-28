# System Architecture

## Overview

The portal follows a classic three-tier web architecture. A single-page React client
talks to a stateless Express REST API, and the API is the only component that
touches PostgreSQL.

```text
User
 ↓
React Frontend
 ↓
Express REST API
 ↓
PostgreSQL
```

## Layers

### Client (`client/`)

- React 19 with Vite, JavaScript and Tailwind CSS.
- React Router handles all page routes, rendered inside a shared `AppLayout`.
- Services will own HTTP calls; hooks and context will hold shared state.
- No business logic and no direct database access.

### API (`server/`)

- Node.js and Express 5, ES modules, started by `server/server.js`.
- Layered structure: `routes` → `controllers` → `services` → `models`.
- `middleware` holds cross-cutting concerns, including centralised error handling.
- `config` owns environment loading and the database pool.
- Exposes the API under the `/api` prefix.

### Database (`database/`)

- PostgreSQL 16, accessed through the `pg` driver and a shared connection pool.
- SQL migrations in `database/migrations`, applied in filename order.
- Schema documentation in `database/schema`.

## Request Flow

```text
1. Browser loads the SPA from Vite
2. User action triggers a route change or an API call
3. Client sends an HTTP request to /api/*
4. Express middleware chain: helmet → cors → json → morgan
5. Router dispatches to a controller
6. Controller delegates to a service
7. Service queries PostgreSQL through a model
8. Controller returns JSON to the client
```

Errors flow back through `notFoundHandler` and `errorHandler`, which produce a
consistent JSON error shape and never leak stack traces in production.

## Planned External Integrations

These are not implemented yet. Each one is isolated behind a service module so the
core API stays testable without external calls.

| Integration | Purpose | Planned location |
| --- | --- | --- |
| OAuth (Google, LinkedIn, University SSO) | Federated sign-in and profile import | `server/src/services/auth/` |
| Payment Gateway (Stripe, PayPal) | Donation processing | `server/src/services/payments/` |
| Email Service (SendGrid, AWS SES) | Verification, invitations, reminders | `server/src/services/notifications/` |
| Cloud Storage (AWS S3) | Avatars, resumes, event media | `server/src/services/storage/` |
| Maps (Google Maps, Mapbox) | Alumni and event location features | `client/src/services/maps/` |
| WebSockets (Socket.IO) | Real-time messaging and live notifications | `server/src/realtime/` |

## Security Baseline

In place now:

- `helmet` for standard HTTP security headers.
- CORS restricted to `CLIENT_URL` with credentials enabled.
- JSON body size limits from Express defaults.
- Secrets sourced from environment variables, never committed.
- Request logging via `morgan`, disabled in test runs.
- Centralised error handler that omits internals in production.
- `audit_logs` table reserved for privileged actions.

Planned: JWT sessions, RBAC middleware, rate limiting, input validation,
CSRF review, and structured security monitoring.

## Cross-Cutting Decisions

- The API is stateless so it can scale horizontally without sticky sessions.
- The client is a single deployable bundle; route-level code splitting is deferred
  until route count grows.
- Real-time messaging will use Socket.IO alongside the REST API rather than
  replacing it; REST remains the source of truth for history.
- Database access is centralised in the pool module; no module opens its own client.
