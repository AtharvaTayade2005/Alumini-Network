# Database Schema Design

Initial design for the Alumni Network Portal. This document describes the intended
relational model. The executable version lives in `database/migrations/001_initial_schema.sql`.

## Conventions

- Table and column names use `snake_case`.
- Primary keys use UUID (`pgcrypto`) for user-facing entities, `SERIAL` for lookup tables.
- Timestamps use `TIMESTAMPTZ` and default to `NOW()`.
- Foreign keys cascade deletes only where the child data has no independent meaning.
- Money uses `NUMERIC(12,2)`, never floating point.
- Optional columns are nullable; required business fields are `NOT NULL`.

## Entities

| Table | Purpose | Key relationships |
| --- | --- | --- |
| `roles` | Role catalogue (alumni, student, admin) | Parent of `users` |
| `users` | Base account record | Belongs to `roles`; parent of profiles, applications, messages |
| `alumni_profiles` | Alumni-specific attributes | One-to-one with `users` |
| `student_profiles` | Student-specific attributes | One-to-one with `users` |
| `skills` | Reusable skill vocabulary | Parent of `user_skills` |
| `user_skills` | User to skill mapping with proficiency | Joins `users` and `skills` |
| `companies` | Employer records | Parent of `jobs` |
| `jobs` | Job and internship postings | Belongs to `companies` and poster (`users`) |
| `job_applications` | Applications to postings | Joins `jobs` and `users` |
| `mentorship_requests` | Mentor/mentee pairing requests | Two references to `users` |
| `events` | Event and reunion records | Belongs to creator (`users`) |
| `event_rsvps` | Attendance responses | Joins `events` and `users` |
| `messages` | One-to-one message history | Sender and receiver both `users` |
| `notifications` | Per-user notification feed | Belongs to `users` |
| `donations` | Donation transactions | Belongs to donor (`users`) |
| `audit_logs` | Append-only security audit trail | Optional actor reference to `users` |

## Relationship Diagram

```text
roles 1 ──< users
users 1 ── 0..1 alumni_profiles
users 1 ── 0..1 student_profiles
users >──< skills        (user_skills)
companies 1 ──< jobs
jobs 1 ──< job_applications >── 1 users (applicant)
users 1 ──< mentorship_requests >── 1 users (mentor, mentee)
users 1 ──< events
events 1 ──< event_rsvps >── 1 users
users 1 ──< messages >── 1 users (receiver)
users 1 ──< notifications
users 1 ──< donations
users 1 ──< audit_logs
```

## Design Notes

- `alumni_profiles` and `student_profiles` are split rather than merged so each role keeps a
  clean column set. Exactly one profile row is expected per user, enforced by `UNIQUE (user_id)`.
- `user_skills` uses a composite primary key `(user_id, skill_id)` to prevent duplicate skill tags.
- `mentorship_requests` has a `CHECK (mentor_id <> mentee_id)` guard against self-pairing.
- `job_applications` has `UNIQUE (job_id, applicant_id)` to block duplicate applications.
- `messages` stores only the delivered history. Real-time delivery via Socket.IO will be added
  later and will not change this table.
- `donations` records gateway references and status only. No card or bank data is ever stored.
- `audit_logs` is append-only and keeps `metadata` as `JSONB` for flexible action context.

## Deferred to Later Phases

- Row level security policies.
- Full-text search indexes for the directory and job search.
- Soft-delete columns, if required by moderation rules.
- Retention policies for messages and audit logs.
