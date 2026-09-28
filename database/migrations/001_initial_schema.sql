-- 001_initial_schema.sql
-- Alumni Network Portal - initial relational foundation
-- Conventions: snake_case, UUID primary keys, timestamptz timestamps.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- Identity & access
-- ---------------------------------------------------------------------

CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email             VARCHAR(255) NOT NULL UNIQUE,
    password_hash     VARCHAR(255),
    role_id           INTEGER NOT NULL REFERENCES roles (id),
    is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE alumni_profiles (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    graduation_year    INTEGER NOT NULL,
    degree             VARCHAR(150) NOT NULL,
    department         VARCHAR(150),
    current_company    VARCHAR(150),
    current_position   VARCHAR(150),
    bio                TEXT,
    location           VARCHAR(150),
    linkedin_url       VARCHAR(255),
    is_mentor          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE student_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    enrollment_year INTEGER NOT NULL,
    degree          VARCHAR(150) NOT NULL,
    department      VARCHAR(150),
    graduation_year INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Skills
-- ---------------------------------------------------------------------

CREATE TABLE skills (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_skills (
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    skill_id    INTEGER NOT NULL REFERENCES skills (id) ON DELETE CASCADE,
    proficiency VARCHAR(20),
    PRIMARY KEY (user_id, skill_id)
);

-- ---------------------------------------------------------------------
-- Jobs & internships
-- ---------------------------------------------------------------------

CREATE TABLE companies (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(200) NOT NULL,
    website    VARCHAR(255),
    industry   VARCHAR(120),
    location   VARCHAR(150),
    logo_url   VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE jobs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    posted_by     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    job_type      VARCHAR(30) NOT NULL,
    location      VARCHAR(150),
    is_remote     BOOLEAN NOT NULL DEFAULT FALSE,
    salary_min    NUMERIC(12, 2),
    salary_max    NUMERIC(12, 2),
    apply_link    VARCHAR(255),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE job_applications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id      UUID NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    cover_letter TEXT,
    status      VARCHAR(30) NOT NULL DEFAULT 'submitted',
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (job_id, applicant_id)
);

-- ---------------------------------------------------------------------
-- Mentorship
-- ---------------------------------------------------------------------

CREATE TABLE mentorship_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    mentee_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    message     TEXT,
    status      VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (mentor_id <> mentee_id)
);

-- ---------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------

CREATE TABLE events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    venue         VARCHAR(200),
    location      VARCHAR(150),
    starts_at     TIMESTAMPTZ NOT NULL,
    ends_at       TIMESTAMPTZ NOT NULL,
    capacity      INTEGER,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_rsvps (
    event_id   UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status     VARCHAR(20) NOT NULL DEFAULT 'going',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);

-- ---------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------

CREATE TABLE messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------

CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type       VARCHAR(50) NOT NULL,
    title      VARCHAR(200) NOT NULL,
    body       TEXT,
    link       VARCHAR(255),
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Donations
-- ---------------------------------------------------------------------

CREATE TABLE donations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    amount        NUMERIC(12, 2) NOT NULL,
    currency      VARCHAR(3) NOT NULL DEFAULT 'USD',
    purpose       VARCHAR(120),
    gateway       VARCHAR(30) NOT NULL,
    gateway_reference VARCHAR(120),
    status        VARCHAR(30) NOT NULL DEFAULT 'pending',
    donated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------

CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    actor_id    UUID REFERENCES users (id) ON DELETE SET NULL,
    action      VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id   VARCHAR(64),
    metadata    JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Indexes for common access patterns
-- ---------------------------------------------------------------------

CREATE INDEX idx_users_role ON users (role_id);
CREATE INDEX idx_alumni_graduation_year ON alumni_profiles (graduation_year);
CREATE INDEX idx_alumni_company ON alumni_profiles (current_company);
CREATE INDEX idx_jobs_company ON jobs (company_id);
CREATE INDEX idx_jobs_active ON jobs (is_active);
CREATE INDEX idx_job_applications_job ON job_applications (job_id);
CREATE INDEX idx_mentorship_mentee ON mentorship_requests (mentee_id);
CREATE INDEX idx_events_starts_at ON events (starts_at);
CREATE INDEX idx_messages_conversation ON messages (sender_id, receiver_id, created_at);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);
