# Database Migrations

Plain SQL migrations applied in filename order.

| File | Description |
| --- | --- |
| `001_initial_schema.sql` | Core tables, foreign keys and indexes for all planned modules. |
| `002_user_presence.sql` | Last-seen tracking on user profiles. |
| `003_connection_pair_symmetry.sql` | Keeps both sides of a connection consistent. |
| `004_student_verification_notes.sql` | Reviewer notes for student verification. |
| `005_community_notification_types.sql` | Mentorship and job notification types plus their indexes. |
| `006_job_posting_integrity.sql` | Company de-duplication, unique company names, withdrawn applications, job indexes. |
| `007_mentorship_job_notifications.sql` | Re-states the 005 notification types and indexes for databases that had already applied 005. |

## Applying migrations

Migrations are plain SQL applied in filename order. Every file is written to be
safe to re-run, so a partially applied sequence can be recovered by running the
remaining files again.

```bash
psql "$DATABASE_URL" -f database/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f database/migrations/002_user_presence.sql
# ... and so on through 007
```

The integration suite applies the whole directory to a fresh in-memory database
on every run, which is the quickest way to check a new migration.

## Seeds

`database/seeds/` is reserved for local development fixtures. No production or
fake production data is committed to this repository.
