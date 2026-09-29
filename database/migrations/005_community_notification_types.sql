-- 005_community_notification_types.sql
-- Mentorship and job activity need notification types that the original
-- constraint did not allow. The constraint is named, so it can be dropped and
-- replaced; rows already in the table are unaffected because every existing
-- type is repeated in the new list.

ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS notifications_type_check;

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

-- Jobs are filtered by work mode, employment type, experience level and salary,
-- and the mentorships screen filters by relationship status. These indexes back
-- the browse queries added with those features.
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
