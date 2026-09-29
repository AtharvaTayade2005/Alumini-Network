-- 004_student_verification_notes.sql
-- alumni_profiles carries verification_notes but student_profiles did not,
-- which made admin verification of student records fail with a column error.
-- Adds the column for symmetry with alumni_profiles.

ALTER TABLE student_profiles
    ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Backfill provenance for already-verified student records so the reviewer is
-- visible in the admin UI rather than being lost.
UPDATE student_profiles
   SET verification_notes = 'Imported without review notes'
 WHERE verification_status = 'verified'
   AND verified_at IS NOT NULL
   AND verification_notes IS NULL;
