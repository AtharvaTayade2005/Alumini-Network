-- 007_mentorship_job_notifications.sql
-- Follow-up to 005 for databases that had already applied it before
-- mentorship and jobs existed. 005 itself is idempotent, but a migration that
-- has already run is not replayed by a tracking runner, so the notification
-- types and indexes those features need are restated here.
--
-- Every statement is safe to re-run.

DO $$
BEGIN
    -- Only widen the constraint: dropping and recreating it loses the intent of
    -- the original definition, so the current list is repeated in full.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'notifications_type_check'
          AND pg_get_constraintdef(oid) LIKE '%application_status%'
    ) THEN
        ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
        ALTER TABLE notifications
            ADD CONSTRAINT notifications_type_check CHECK (type IN
                ('mentorship_request', 'mentorship_accepted', 'mentorship_declined',
                 'mentorship_ended',
                 'connection_request', 'connection_accepted',
                 'new_message', 'message', 'profile_view',
                 'job_posted', 'new_job_match', 'application_received',
                 'application_status', 'job_application_update', 'job_moderated',
                 'event_rsvp', 'event_reminder', 'event_cancelled',
                 'donation_confirmation',
                 'admin_notice', 'verification_result', 'system'));
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_mentorship_rel_status
    ON mentorship_relationships (status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentorship_req_status
    ON mentorship_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status_deadline
    ON jobs (status, deadline);
CREATE INDEX IF NOT EXISTS idx_job_skills_job
    ON job_skills (job_id);
CREATE INDEX IF NOT EXISTS idx_companies_name
    ON companies (LOWER(name));

-- Browsing filters jobs by these columns, and the mentorships screen filters
-- relationships by status, so those queries need backing indexes.
CREATE INDEX IF NOT EXISTS idx_jobs_work_mode
    ON jobs (work_mode) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type
    ON jobs (employment_type) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_jobs_experience_level
    ON jobs (experience_level) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant
    ON job_applications (applicant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user
    ON saved_jobs (user_id, created_at DESC);
