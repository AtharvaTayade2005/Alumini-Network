-- 003_connection_pair_symmetry.sql
-- The original UNIQUE (requester_id, addressee_id) only prevented exact
-- duplicates in the same direction, so A->B and B->A could both exist. Replace
-- it with a symmetric index so a connection is unique per unordered pair.

ALTER TABLE connections DROP CONSTRAINT connections_pair_unique;

CREATE UNIQUE INDEX connections_pair_symmetric_unique
    ON connections (
        LEAST(requester_id, addressee_id),
        GREATEST(requester_id, addressee_id)
    );
