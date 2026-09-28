# Database Migrations

Plain SQL migrations applied in filename order.

| File | Description |
| --- | --- |
| `001_initial_schema.sql` | Core tables, foreign keys and indexes for all planned modules. |

## Applying migrations

Run against a local database using `psql`:

```bash
psql "$DATABASE_URL" -f database/migrations/001_initial_schema.sql
```

The API does not yet run or track migrations automatically. A migration runner
will be added when the first feature is implemented.

## Seeds

`database/seeds/` is reserved for local development fixtures. No production or
fake production data is committed to this repository.
