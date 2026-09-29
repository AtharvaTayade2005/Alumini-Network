-- 001_roles.sql
-- The roles table enforces uniqueness on LOWER(name) via a functional index
-- (idx_roles_name_lower), so the conflict target must be that expression
-- rather than the bare column.

INSERT INTO roles (name, description) VALUES
    ('ADMIN', 'University administrator with full platform access'),
    ('ALUMNI', 'Verified graduate of the university'),
    ('STUDENT', 'Currently enrolled student'),
    ('MODERATOR', 'Content moderator (reserved for future use)')
ON CONFLICT (LOWER(name)) DO NOTHING;
