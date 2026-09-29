-- 001_initial_schema.sql
-- Alumni Network Portal - core relational foundation
-- Conventions: snake_case, UUID primary keys, timestamptz timestamps,
-- updated_at maintained by trigger.
--
-- No extensions are required: gen_random_uuid() is core from PostgreSQL 13
-- onwards, and case-insensitive uniqueness uses functional unique indexes.
-- This keeps the schema installable on managed Postgres without superuser.

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- CORE: identity, roles, accounts
-- =========================================================

CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email             VARCHAR(255) NOT NULL,
    password_hash       VARCHAR(255),
    first_name          VARCHAR(80) NOT NULL,
    last_name           VARCHAR(80) NOT NULL,
    phone               VARCHAR(25),
    avatar_url          VARCHAR(500),
    is_email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_suspended        BOOLEAN NOT NULL DEFAULT FALSE,
    suspension_reason   TEXT,
    last_login_at       TIMESTAMPTZ,
    failed_login_count  INTEGER NOT NULL DEFAULT 0,
    locked_until        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_password_or_oauth CHECK (
        password_hash IS NOT NULL OR avatar_url IS NOT NULL
    )
);

CREATE TABLE user_roles (
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id     INTEGER NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
    assigned_by UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- Alumni verification state machine (FR-1.1)
CREATE TABLE alumni_profiles (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    student_id_number    VARCHAR(60),
    graduation_year      INTEGER,
    degree               VARCHAR(150),
    department           VARCHAR(150),
    current_company      VARCHAR(150),
    current_position     VARCHAR(150),
    industry             VARCHAR(120),
    bio                  TEXT,
    city                 VARCHAR(120),
    region               VARCHAR(120),
    country              VARCHAR(120),
    latitude             NUMERIC(9, 6),
    longitude            NUMERIC(9, 6),
    is_open_to_mentor    BOOLEAN NOT NULL DEFAULT FALSE,
    mentorship_capacity  INTEGER NOT NULL DEFAULT 1,
    show_on_map          BOOLEAN NOT NULL DEFAULT FALSE,
    verification_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
    verified_by          UUID REFERENCES users (id) ON DELETE SET NULL,
    verified_at          TIMESTAMPTZ,
    verification_notes   TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT alumni_verification_status_check
        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    CONSTRAINT alumni_coord_pair_check
        CHECK ((latitude IS NULL AND longitude IS NULL)
            OR (latitude IS NOT NULL AND longitude IS NOT NULL)),
    CONSTRAINT alumni_mentor_capacity_check
        CHECK (mentorship_capacity >= 0)
);

CREATE TABLE student_profiles (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    student_id_number    VARCHAR(60),
    department           VARCHAR(150),
    degree               VARCHAR(150) NOT NULL,
    year_of_study        INTEGER,
    expected_graduation  INTEGER,
    career_interests     TEXT,
    bio                  TEXT,
    resume_url           VARCHAR(500),
    resume_filename      VARCHAR(255),
    is_open_to_mentorship BOOLEAN NOT NULL DEFAULT TRUE,
    show_on_map          BOOLEAN NOT NULL DEFAULT FALSE,
    city                 VARCHAR(120),
    region               VARCHAR(120),
    country              VARCHAR(120),
    verification_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
    verified_by          UUID REFERENCES users (id) ON DELETE SET NULL,
    verified_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT student_verification_status_check
        CHECK (verification_status IN ('pending', 'verified', 'rejected'))
);

-- =========================================================
-- PROFILE: skills, companies, education, experience, links, privacy
-- =========================================================

CREATE TABLE skills (
    id         SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    category   VARCHAR(60),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_skills (
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    skill_id    INTEGER NOT NULL REFERENCES skills (id) ON DELETE CASCADE,
    proficiency VARCHAR(20),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, skill_id),
    CONSTRAINT user_skills_proficiency_check
        CHECK (proficiency IS NULL OR proficiency IN
            ('beginner', 'intermediate', 'advanced', 'expert'))
);

CREATE TABLE companies (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    website     VARCHAR(255),
    industry    VARCHAR(120),
    location    VARCHAR(150),
    logo_url    VARCHAR(500),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE education (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    institution  VARCHAR(200) NOT NULL,
    degree       VARCHAR(150),
    field_of_study VARCHAR(150),
    start_year   INTEGER,
    end_year     INTEGER,
    grade        VARCHAR(20),
    description  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE experience (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    company_id    UUID REFERENCES companies (id) ON DELETE SET NULL,
    company_name  VARCHAR(200) NOT NULL,
    title         VARCHAR(150) NOT NULL,
    location      VARCHAR(150),
    description   TEXT,
    is_current    BOOLEAN NOT NULL DEFAULT FALSE,
    start_date    DATE,
    end_date      DATE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT experience_date_order_check
        CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE TABLE social_links (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    platform   VARCHAR(30) NOT NULL,
    url        VARCHAR(500) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT social_links_platform_check CHECK (platform IN
        ('linkedin', 'github', 'portfolio', 'twitter', 'website', 'other')),
    UNIQUE (user_id, platform)
);

-- Conservative-by-default privacy controls (SRS 29)
CREATE TABLE privacy_settings (
    user_id                  UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    show_email               BOOLEAN NOT NULL DEFAULT FALSE,
    show_phone               BOOLEAN NOT NULL DEFAULT FALSE,
    show_location            BOOLEAN NOT NULL DEFAULT TRUE,
    show_employer            BOOLEAN NOT NULL DEFAULT TRUE,
    show_social_links        BOOLEAN NOT NULL DEFAULT TRUE,
    show_profile_in_directory BOOLEAN NOT NULL DEFAULT TRUE,
    show_mentorship_availability BOOLEAN NOT NULL DEFAULT TRUE,
    allow_connection_requests BOOLEAN NOT NULL DEFAULT TRUE,
    allow_messages_from      VARCHAR(20) NOT NULL DEFAULT 'connections',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT privacy_messages_from_check CHECK (allow_messages_from IN
        ('everyone', 'connections', 'nobody'))
);

-- =========================================================
-- NETWORKING
-- =========================================================

CREATE TABLE connections (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    addressee_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending',
    responded_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT connections_status_check
        CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    CONSTRAINT connections_no_self CHECK (requester_id <> addressee_id),
    CONSTRAINT connections_pair_unique UNIQUE (requester_id, addressee_id)
);

CREATE TABLE mentorship_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id           UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    mentee_id           UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    career_goal         TEXT NOT NULL,
    area_of_interest    VARCHAR(150) NOT NULL,
    message             TEXT,
    preferred_mode      VARCHAR(20) NOT NULL DEFAULT 'email',
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    response_note       TEXT,
    responded_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT mentorship_requests_status_check CHECK (status IN
        ('pending', 'accepted', 'rejected', 'cancelled')),
    CONSTRAINT mentorship_requests_mode_check CHECK (preferred_mode IN
        ('email', 'chat', 'call', 'video')),
    CONSTRAINT mentorship_requests_no_self CHECK (mentor_id <> mentee_id),
    CONSTRAINT mentorship_requests_pair_unique UNIQUE (mentor_id, mentee_id)
);

CREATE TABLE mentorship_relationships (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id    UUID NOT NULL UNIQUE REFERENCES mentorship_requests (id) ON DELETE CASCADE,
    mentor_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    mentee_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status        VARCHAR(20) NOT NULL DEFAULT 'active',
    started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at      TIMESTAMPTZ,
    ended_by      UUID REFERENCES users (id) ON DELETE SET NULL,
    end_reason    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT mentorship_status_check CHECK (status IN
        ('active', 'completed', 'ended')),
    CONSTRAINT mentorship_no_self CHECK (mentor_id <> mentee_id)
);

CREATE TABLE messages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    body         TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT messages_no_self CHECK (sender_id <> recipient_id)
);

CREATE TABLE message_read_status (
    message_id  UUID NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    read_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

-- =========================================================
-- JOBS
-- =========================================================

CREATE TABLE jobs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    posted_by         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    company_id        UUID REFERENCES companies (id) ON DELETE SET NULL,
    company_name      VARCHAR(200) NOT NULL,
    title             VARCHAR(200) NOT NULL,
    description       TEXT NOT NULL,
    location          VARCHAR(150),
    work_mode         VARCHAR(20) NOT NULL DEFAULT 'onsite',
    employment_type   VARCHAR(20) NOT NULL DEFAULT 'full_time',
    salary_min        INTEGER,
    salary_max        INTEGER,
    salary_currency   VARCHAR(3) NOT NULL DEFAULT 'USD',
    experience_level  VARCHAR(20) NOT NULL DEFAULT 'mid',
    application_url   VARCHAR(500),
    deadline          DATE,
    status            VARCHAR(20) NOT NULL DEFAULT 'active',
    is_moderated      BOOLEAN NOT NULL DEFAULT FALSE,
    moderation_note   TEXT,
    view_count        INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT jobs_work_mode_check CHECK (work_mode IN
        ('remote', 'hybrid', 'onsite')),
    CONSTRAINT jobs_employment_type_check CHECK (employment_type IN
        ('full_time', 'part_time', 'internship', 'contract')),
    CONSTRAINT jobs_experience_level_check CHECK (experience_level IN
        ('entry', 'mid', 'senior', 'lead')),
    CONSTRAINT jobs_status_check CHECK (status IN
        ('draft', 'active', 'closed', 'hidden', 'removed')),
    CONSTRAINT jobs_salary_order_check
        CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_max >= salary_min)
);

CREATE TABLE job_skills (
    job_id     UUID NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
    skill_id   INTEGER NOT NULL REFERENCES skills (id) ON DELETE CASCADE,
    required   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (job_id, skill_id)
);

CREATE TABLE job_applications (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id         UUID NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
    applicant_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    cover_letter   TEXT,
    resume_url     VARCHAR(500),
    external_url   VARCHAR(500),
    status         VARCHAR(20) NOT NULL DEFAULT 'submitted',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT applications_status_check CHECK (status IN
        ('submitted', 'under_review', 'shortlisted', 'rejected', 'accepted')),
    CONSTRAINT applications_unique_per_job UNIQUE (job_id, applicant_id),
    CONSTRAINT applications_has_attachment CHECK (
        resume_url IS NOT NULL OR external_url IS NOT NULL
    )
);

CREATE TABLE saved_jobs (
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    job_id     UUID NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, job_id)
);

-- =========================================================
-- EVENTS
-- =========================================================

CREATE TABLE events (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id          UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title                 VARCHAR(200) NOT NULL,
    description           TEXT NOT NULL,
    event_date            DATE NOT NULL,
    start_time            TIME NOT NULL,
    end_time              TIME NOT NULL,
    venue                 VARCHAR(200),
    virtual_url           VARCHAR(500),
    city                  VARCHAR(120),
    region                VARCHAR(120),
    country               VARCHAR(120),
    latitude              NUMERIC(9, 6),
    longitude             NUMERIC(9, 6),
    max_attendees         INTEGER,
    registration_deadline DATE,
    status                VARCHAR(20) NOT NULL DEFAULT 'published',
    is_moderated          BOOLEAN NOT NULL DEFAULT FALSE,
    moderation_note       TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT events_time_order_check CHECK (end_time > start_time),
    CONSTRAINT events_status_check CHECK (status IN
        ('draft', 'published', 'cancelled', 'completed', 'removed')),
    CONSTRAINT events_capacity_check
        CHECK (max_attendees IS NULL OR max_attendees > 0),
    CONSTRAINT events_coord_pair_check
        CHECK ((latitude IS NULL AND longitude IS NULL)
            OR (latitude IS NOT NULL AND longitude IS NOT NULL))
);

CREATE TABLE event_rsvps (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'going',
    guest_count INTEGER NOT NULL DEFAULT 0,
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT rsvps_status_check CHECK (status IN ('going', 'interested', 'cancelled')),
    CONSTRAINT rsvps_guest_check CHECK (guest_count >= 0 AND guest_count <= 5),
    CONSTRAINT rsvps_unique UNIQUE (event_id, user_id)
);

CREATE TABLE event_attendees (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, user_id)
);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type        VARCHAR(40) NOT NULL,
    title       VARCHAR(200) NOT NULL,
    body        TEXT,
    link        VARCHAR(300),
    actor_id    UUID REFERENCES users (id) ON DELETE SET NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT notifications_type_check CHECK (type IN
        ('mentorship_request', 'mentorship_accepted', 'connection_request',
         'connection_accepted', 'new_message', 'job_application_update',
         'new_job_match', 'event_rsvp', 'event_reminder', 'event_cancelled',
         'donation_confirmation', 'admin_notice', 'verification_result'))
);

CREATE TABLE notification_preferences (
    user_id        UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    email_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    muted_types    TEXT[] NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- DONATIONS
-- =========================================================

CREATE TABLE donations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id          UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    amount            NUMERIC(12, 2) NOT NULL,
    currency          VARCHAR(3) NOT NULL DEFAULT 'USD',
    purpose           VARCHAR(120),
    is_anonymous      BOOLEAN NOT NULL DEFAULT FALSE,
    message           TEXT,
    status            VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT donations_amount_check CHECK (amount > 0),
    CONSTRAINT donations_status_check CHECK (status IN
        ('pending', 'completed', 'failed', 'refunded'))
);

CREATE TABLE payment_transactions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id       UUID NOT NULL REFERENCES donations (id) ON DELETE CASCADE,
    provider          VARCHAR(20) NOT NULL,
    provider_reference VARCHAR(160),
    idempotency_key   VARCHAR(120) UNIQUE,
    amount            NUMERIC(12, 2) NOT NULL,
    currency          VARCHAR(3) NOT NULL DEFAULT 'USD',
    status            VARCHAR(20) NOT NULL DEFAULT 'created',
    raw_payload       JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT transactions_provider_check CHECK (provider IN
        ('stripe', 'paypal', 'manual')),
    CONSTRAINT transactions_status_check CHECK (status IN
        ('created', 'pending', 'succeeded', 'failed', 'refunded')),
    CONSTRAINT transactions_amount_check CHECK (amount > 0)
);

CREATE TABLE donation_receipts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id   UUID NOT NULL UNIQUE REFERENCES donations (id) ON DELETE CASCADE,
    receipt_number VARCHAR(40) NOT NULL UNIQUE,
    issued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    emailed_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- ADMIN
-- =========================================================

CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    actor_id    UUID REFERENCES users (id) ON DELETE SET NULL,
    action      VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id   VARCHAR(64),
    metadata    JSONB,
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(300),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reports (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    target_type  VARCHAR(30) NOT NULL,
    target_id    UUID NOT NULL,
    reason       VARCHAR(40) NOT NULL,
    details      TEXT,
    status       VARCHAR(20) NOT NULL DEFAULT 'open',
    resolution   TEXT,
    resolved_by  UUID REFERENCES users (id) ON DELETE SET NULL,
    resolved_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT reports_status_check CHECK (status IN
        ('open', 'reviewing', 'resolved', 'dismissed')),
    CONSTRAINT reports_reason_check CHECK (reason IN
        ('spam', 'harassment', 'inappropriate', 'fraud', 'other')),
    CONSTRAINT reports_target_check CHECK (target_type IN
        ('user', 'job', 'event', 'message', 'company'))
);

CREATE TABLE moderation_actions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moderator_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    action      VARCHAR(40) NOT NULL,
    target_type VARCHAR(30) NOT NULL,
    target_id   UUID NOT NULL,
    reason      TEXT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT moderation_action_check CHECK (action IN
        ('hide', 'remove', 'restore', 'suspend', 'reactivate',
         'warn', 'dismiss_report', 'resolve_report')),
    CONSTRAINT moderation_target_check CHECK (target_type IN
        ('user', 'job', 'event', 'message', 'company', 'report'))
);

-- =========================================================
-- SYSTEM: tokens
-- =========================================================

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(128) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    user_agent  VARCHAR(300),
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(128) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE email_verification_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(128) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OAuth identity linkage
CREATE TABLE oauth_accounts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    provider     VARCHAR(30) NOT NULL,
    provider_user_id VARCHAR(160) NOT NULL,
    email        VARCHAR(255),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT oauth_provider_check CHECK (provider IN
        ('google', 'linkedin', 'sso')),
    CONSTRAINT oauth_provider_user_unique UNIQUE (provider, provider_user_id)
);

-- Email outbox: async delivery, retried by the mail worker
CREATE TABLE email_queue (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email     VARCHAR(255) NOT NULL,
    subject      VARCHAR(300) NOT NULL,
    template     VARCHAR(60) NOT NULL,
    payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
    attempts     INTEGER NOT NULL DEFAULT 0,
    last_error   TEXT,
    sent_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- updated_at triggers
-- =========================================================

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'roles','users','alumni_profiles','student_profiles','companies',
        'education','experience','social_links','privacy_settings','connections',
        'mentorship_requests','mentorship_relationships','jobs',
        'job_applications','events','event_rsvps','notifications',
        'notification_preferences','donations','payment_transactions','reports'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
    END LOOP;
END $$;

-- =========================================================
-- Indexes for search and access patterns
-- =========================================================

CREATE INDEX idx_users_active ON users (is_active, is_suspended);
CREATE INDEX idx_users_last_name ON users (last_name);
CREATE INDEX idx_user_roles_role ON user_roles (role_id);

CREATE INDEX idx_alumni_grad_year ON alumni_profiles (graduation_year);
CREATE INDEX idx_alumni_company ON alumni_profiles (current_company);
CREATE INDEX idx_alumni_industry ON alumni_profiles (industry);
CREATE INDEX idx_alumni_department ON alumni_profiles (department);
CREATE INDEX idx_alumni_country ON alumni_profiles (country);
CREATE INDEX idx_alumni_verification ON alumni_profiles (verification_status);
CREATE INDEX idx_alumni_mentor ON alumni_profiles (is_open_to_mentor)
    WHERE is_open_to_mentor = TRUE;

CREATE INDEX idx_student_department ON student_profiles (department);
CREATE INDEX idx_student_graduation ON student_profiles (expected_graduation);
CREATE INDEX idx_student_verification ON student_profiles (verification_status);

CREATE INDEX idx_user_skills_skill ON user_skills (skill_id);
CREATE INDEX idx_education_user ON education (user_id);
CREATE INDEX idx_experience_user ON experience (user_id);
CREATE INDEX idx_experience_company ON experience (company_id);
CREATE INDEX idx_social_links_user ON social_links (user_id);

CREATE INDEX idx_connections_requester ON connections (requester_id, status);
CREATE INDEX idx_connections_addressee ON connections (addressee_id, status);

CREATE INDEX idx_mentorship_req_mentee ON mentorship_requests (mentee_id, status);
CREATE INDEX idx_mentorship_req_mentor ON mentorship_requests (mentor_id, status);
CREATE INDEX idx_mentorship_rel_mentor ON mentorship_relationships (mentor_id, status);
CREATE INDEX idx_mentorship_rel_mentee ON mentorship_relationships (mentee_id, status);

CREATE INDEX idx_messages_pair ON messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX idx_messages_recipient ON messages (recipient_id, created_at DESC);
CREATE INDEX idx_message_read_user ON message_read_status (user_id);

CREATE INDEX idx_jobs_status_created ON jobs (status, created_at DESC);
CREATE INDEX idx_jobs_company ON jobs (company_name);
CREATE INDEX idx_jobs_work_mode ON jobs (work_mode);
CREATE INDEX idx_jobs_employment_type ON jobs (employment_type);
CREATE INDEX idx_jobs_deadline ON jobs (deadline)
    WHERE status = 'active';
CREATE INDEX idx_jobs_title_trgm ON jobs (title text_pattern_ops);
CREATE INDEX idx_job_skills_skill ON job_skills (skill_id);
CREATE INDEX idx_applications_applicant ON job_applications (applicant_id, created_at DESC);
CREATE INDEX idx_applications_job_status ON job_applications (job_id, status);
CREATE INDEX idx_saved_jobs_user ON saved_jobs (user_id, created_at DESC);

CREATE INDEX idx_events_date ON events (event_date DESC);
CREATE INDEX idx_events_status ON events (status);
CREATE INDEX idx_events_city ON events (city);
CREATE INDEX idx_rsvps_user ON event_rsvps (user_id);
CREATE INDEX idx_rsvps_event_status ON event_rsvps (event_id, status);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE is_read = FALSE;

CREATE INDEX idx_donations_donor ON donations (donor_id, created_at DESC);
CREATE INDEX idx_donations_status ON donations (status);
CREATE INDEX idx_transactions_donation ON payment_transactions (donation_id);
CREATE INDEX idx_transactions_provider_ref ON payment_transactions (provider, provider_reference);

CREATE INDEX idx_reports_status ON reports (status, created_at DESC);
CREATE INDEX idx_reports_target ON reports (target_type, target_id);

CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at DESC);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_password_reset_user ON password_reset_tokens (user_id);
CREATE INDEX idx_email_verify_user ON email_verification_tokens (user_id);
CREATE INDEX idx_email_queue_pending ON email_queue (created_at) WHERE sent_at IS NULL;

-- Case-insensitive uniqueness, replacing the citext extension.
CREATE UNIQUE INDEX idx_roles_name_lower ON roles (LOWER(name));
CREATE UNIQUE INDEX idx_users_email_lower ON users (LOWER(email));
CREATE UNIQUE INDEX idx_skills_name_lower ON skills (LOWER(name));
CREATE INDEX idx_email_queue_to_lower ON email_queue (LOWER(to_email));

