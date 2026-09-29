-- 006_job_posting_integrity.sql
-- Job posting and company lookup depend on invariants the initial schema did
-- not provide. Existing rows are repaired before the constraints are added so
-- this migration is safe to run against a populated database.

-- Companies are created automatically when a member posts a job, so the same
-- employer can be inserted twice with different casing. Merge duplicates,
-- keeping the oldest row, then repoint every reference at the survivor.
CREATE TEMP TABLE company_dedupe AS
SELECT
    id,
    FIRST_VALUE(id) OVER (
        PARTITION BY LOWER(name) ORDER BY created_at, id
    ) AS keep_id
FROM companies;

UPDATE experience e
SET company_id = d.keep_id
FROM company_dedupe d
WHERE e.company_id = d.id AND d.id <> d.keep_id;

UPDATE jobs j
SET company_id = d.keep_id
FROM company_dedupe d
WHERE j.company_id = d.id AND d.id <> d.keep_id;

DELETE FROM companies c
USING company_dedupe d
WHERE c.id = d.id AND d.id <> d.keep_id;

DROP TABLE company_dedupe;

-- One company per name, case-insensitively. This is what lets job posting use
-- ON CONFLICT to reuse an existing company row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_name_lower_unique
    ON companies (LOWER(name));

-- Applicants need to withdraw; the poster keeps seeing the outcome.
ALTER TABLE job_applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE job_applications ADD CONSTRAINT applications_status_check CHECK (status IN
    ('submitted', 'under_review', 'shortlisted', 'rejected', 'accepted', 'withdrawn'));

-- Discoverability: the job board filters and sorts on these columns.
CREATE INDEX IF NOT EXISTS idx_jobs_status_created
    ON jobs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_work_mode
    ON jobs (work_mode) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type
    ON jobs (employment_type) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_jobs_experience_level
    ON jobs (experience_level) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_jobs_company
    ON jobs (company_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_jobs_title_lower
    ON jobs (LOWER(title));
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_created
    ON saved_jobs (user_id, created_at DESC);
