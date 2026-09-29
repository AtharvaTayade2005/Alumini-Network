# System Architecture

## Overview

The portal follows a classic three-tier web architecture. A single-page React
client talks to a stateless Express API, and the API is the only component that
touches PostgreSQL.

```text
User
  |
  v
React Frontend (Vite)
  |  HTTPS / JSON, Bearer access token, Socket.IO for realtime
  v
Express API  <---->  Socket.IO gateway
  |
  v
PostgreSQL
```

## Layers

### Client (`client/`)

- React 19 with Vite, JavaScript and Tailwind CSS.
- React Router handles all page routes, rendered inside a shared `AppLayout`.
- Services own HTTP calls; hooks and context hold shared state.
- No business logic and no direct database access.

### API (`server/`)

- Node.js and Express 5, ES modules, started by `server/server.js`.
- Layered structure: `routes` -> `controllers` -> `services` -> `models`.
- `middleware` holds cross-cutting concerns, including centralised error handling.
- `config` owns environment loading and the database pool.
- Exposes the API under the `/api` prefix.

### Database (`database/`)

- PostgreSQL, accessed through the `pg` driver and a shared connection pool.
- SQL migrations in `database/migrations`, applied in filename order and
  recorded in `schema_migrations`.
- Schema documentation in `database/schema`.

## Request Flow

```text
1. Browser loads the SPA from Vite
2. User action triggers a route change or an API call
3. Client sends an HTTP request to /api/*
4. Express middleware chain: helmet -> cors -> cookie-parser -> json
   -> rate limit -> database-availability gate -> CSRF
5. Router authenticates the request and validates input (Zod)
6. Controller delegates to a service
7. Service queries PostgreSQL through a model
8. Controller returns a uniform JSON envelope to the client
```

Errors flow back through `notFound` and `errorHandler`, which produce a
consistent JSON error shape and never leak stack traces in production.

## Authentication

- **Access tokens** are short-lived JWTs (15 min by default) signed with
  `JWT_SECRET`, sent as `Authorization: Bearer <token>`.
- **Refresh tokens** are opaque random strings, never JWTs. Only a SHA-256 hash
  is stored in `refresh_tokens`, so a database leak cannot be replayed. They are
  delivered in an `httpOnly` cookie scoped to `/api/auth` and rotated on every
  use; a replayed token is rejected.
- **CSRF**: cookie-authenticated state changes must echo the readable
  `csrf_token` cookie in an `x-csrf-token` header.
- **Passwords** are hashed with bcrypt (12 rounds in production, fewer in tests
  to keep the suite fast).
- **RBAC**: `user_roles` maps users to roles; middleware enforces access.

## Realtime

Socket.IO runs alongside REST rather than replacing it; REST remains the source
of truth for message history. The handshake is authenticated with the access
token, and presence is tracked in the `user_presence` table. Clients join a
per-pair room (`conversation:<sorted-ids>`) and a per-user room
(`user:<id>`) for direct notifications.

## External Integrations

Each integration sits behind a service module with a development fallback, so
the core API stays testable and runnable without external accounts.

| Integration | Purpose | Location | Status |
| --- | --- | --- | --- |
| Email (log, SMTP) | Verification, password reset, notifications | `server/src/services/mailService.js` | Implemented (log default) |
| File storage (local) | Resumes and event media | `server/src/middleware/upload.js` | Implemented (local only) |
| Object storage (S3) | Resumes and event media | – | Planned (`STORAGE_DRIVER` and S3 settings already wired into config) |
| Socket.IO | Real-time messaging and notifications | `server/src/sockets/` | Implemented |
| OAuth (Google, LinkedIn, SSO) | Federated sign-in | `server/src/services/auth/` | Planned |
| Payment gateway (Stripe, PayPal) | Donation processing | `server/src/services/payments/` | Planned |
| Maps (Google Maps, Mapbox) | Alumni and event location features | `client/src/services/maps/` | Planned |

## Security Baseline

In place:

- `helmet` for standard HTTP security headers.
- CORS restricted to `CLIENT_URL` with credentials enabled.
- JSON body size limits.
- Secrets sourced from environment variables, never committed. Production boot
  fails fast if JWT secrets are missing, too short, identical, or equal to the
  development fallback.
- Structured JSON request/error logging with request IDs, without secrets.
- Zod validation on every mutating and list endpoint; SQL is always
  parameterised.
- Per-IP rate limiting on global, auth, write, and upload scopes.
- CSRF protection on cookie-authenticated state changes.
- `audit_logs` written for privileged actions.

## Cross-Cutting Decisions

- The API is stateless so it can scale horizontally without sticky sessions.
- Real-time messaging uses Socket.IO alongside the REST API rather than
  replacing it.
- Database access is centralised in the pool module; no module opens its own client.
- Case-insensitive uniqueness is enforced with functional indexes on
  `LOWER(column)` rather than the `citext` extension, keeping the schema
  portable.
- Local development can run entirely on PGlite (`npm run dev:db`), which serves
  the PostgreSQL wire protocol in-process. Because PGlite is single-session, the
  pool is pinned to one connection when it detects that URL.

## Running Locally

```bash
cd server
npm install
npm run dev:db     # terminal 1: in-memory PostgreSQL on 127.0.0.1:54329
npm run migrate    # terminal 2: apply migrations
npm run seed       # load roles
npm run dev        # API on http://localhost:5000
npm test           # spins up its own ephemeral PGlite
```

No `.env` file is required for local development. See `.env.example` for the
full list of supported variables and the production requirements.
