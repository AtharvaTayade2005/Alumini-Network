# API Reference

Base URL: `http://localhost:5000/api`

## Conventions

- All endpoints are namespaced under `/api`.
- Responses are JSON.
- Errors use a single shape:

```json
{
  "error": {
    "status": 404,
    "message": "Route not found: GET /api/unknown"
  }
}
```

- In non-production environments, 500 responses also include a `stack` field.

## Endpoints

### GET /api/health

Liveness check used by local development and future deployment probes.

**Response 200**

```json
{
  "status": "ok",
  "service": "Alumni Network Portal API"
}
```

## Planned Endpoints

Not implemented. Reserved namespaces for future routes:

| Prefix | Module |
| --- | --- |
| `/api/auth` | Registration, login, OAuth callbacks, sessions |
| `/api/users` | Profile management |
| `/api/directory` | Alumni search and filters |
| `/api/mentorship` | Mentor/mentee requests |
| `/api/jobs` | Job postings and applications |
| `/api/events` | Events and RSVPs |
| `/api/messages` | Conversations (REST; real-time via Socket.IO) |
| `/api/notifications` | Notification feed |
| `/api/donations` | Donation initiation and history |
| `/api/admin` | Moderation, analytics, audit review |
