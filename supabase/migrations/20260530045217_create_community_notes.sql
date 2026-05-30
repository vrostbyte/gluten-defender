-- Add new columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN account_created_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN is_trusted_reviewer boolean NOT NULL DEFAULT false;

-- Backfill account_created_at with existing created_at
UPDATE user_profiles SET account_created_at = created_at;

-- Create community_notes table
CREATE TABLE community_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_barcode text NOT NULL REFERENCES products(barcode) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_type text NOT NULL CHECK (note_type IN ('reaction', 'verified_safe', 'recipe_changed', 'cross_contamination', 'ingredient_correction', 'general')),
    body text CHECK (char_length(body) <= 1000),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    helpful_count integer NOT NULL DEFAULT 0,
    reported_count integer NOT NULL DEFAULT 0,
    soft_hidden boolean NOT NULL DEFAULT false
);

-- Indexes for community_notes
CREATE INDEX idx_community_notes_product_barcode_created_at ON community_notes(product_barcode, created_at DESC);
CREATE INDEX idx_community_notes_user_id ON community_notes(user_id);

-- Enable RLS on community_notes
ALTER TABLE community_notes ENABLE ROW LEVEL SECURITY;

-- Policies for community_notes
CREATE POLICY "Anyone can read non-hidden notes" ON community_notes
    FOR SELECT
    USING (soft_hidden = false);

CREATE POLICY "Users can read their own hidden notes" ON community_notes
    FOR SELECT
    USING (auth.uid() = user_id AND soft_hidden = true);

CREATE POLICY "Users can insert their own notes" ON community_notes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own note bodies" ON community_notes
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    -- Note: Column restrictions are usually handled at the application level, but we can't restrict columns in standard RLS easily without revoking update privileges and granting specific column updates.
    -- The application server action will enforce that only the body can be changed.

CREATE POLICY "Users can delete their own notes" ON community_notes
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger for updated_at on community_notes
CREATE OR REPLACE FUNCTION set_community_notes_updated_at()
RETURNS trigger AS $$
BEGIN
    IF NEW.body IS DISTINCT FROM OLD.body THEN
        NEW.updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_community_notes_updated_at
    BEFORE UPDATE ON community_notes
    FOR EACH ROW
    EXECUTE FUNCTION set_community_notes_updated_at();

-- Create note_reports table
CREATE TABLE note_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id uuid NOT NULL REFERENCES community_notes(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason text CHECK (char_length(reason) <= 500),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (note_id, user_id)
);

-- Function to prevent reporting own note
RETURNS trigger AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM community_notes WHERE id = NEW.note_id AND user_id = NEW.user_id) THEN
        RAISE EXCEPTION 'Users cannot report their own notes';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_report_not_own_note
    BEFORE INSERT ON note_reports
    FOR EACH ROW
    EXECUTE FUNCTION check_report_not_own_note();

-- Enable RLS on note_reports
ALTER TABLE note_reports ENABLE ROW LEVEL SECURITY;

-- Policies for note_reports (Admin only for SELECT)
CREATE POLICY "Users can insert reports" ON note_reports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
-- No SELECT policy for end-users, no UPDATE, no DELETE.

-- Trigger for incrementing reported_count and soft-hiding
CREATE OR REPLACE FUNCTION handle_note_report()
RETURNS trigger AS $$
DECLARE
    current_reported_count integer;
    SOFT_HIDE_THRESHOLD constant integer := 3; -- Configurable threshold
BEGIN
    -- Increment reported_count
    UPDATE community_notes
    SET reported_count = reported_count + 1
    WHERE id = NEW.note_id
    RETURNING reported_count INTO current_reported_count;

    -- Check if threshold reached
    IF current_reported_count >= SOFT_HIDE_THRESHOLD THEN
        UPDATE community_notes
        SET soft_hidden = true
        WHERE id = NEW.note_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- Runs as database owner to update community_notes even if user doesn't own it

CREATE TRIGGER trg_handle_note_report
    AFTER INSERT ON note_reports
    FOR EACH ROW
    EXECUTE FUNCTION handle_note_report();

-- Create note_helpful_votes table
CREATE TABLE note_helpful_votes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id uuid NOT NULL REFERENCES community_notes(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (note_id, user_id)
);

-- Trigger to prevent self-voting
CREATE OR REPLACE FUNCTION check_vote_not_own_note()
RETURNS trigger AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM community_notes WHERE id = NEW.note_id AND user_id = NEW.user_id) THEN
        RAISE EXCEPTION 'Users cannot vote on their own notes';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_vote_not_own_note
    BEFORE INSERT ON note_helpful_votes
    FOR EACH ROW
    EXECUTE FUNCTION check_vote_not_own_note();

-- Enable RLS on note_helpful_votes
ALTER TABLE note_helpful_votes ENABLE ROW LEVEL SECURITY;

-- Policies for note_helpful_votes
CREATE POLICY "Anyone can read helpful votes" ON note_helpful_votes
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert helpful votes" ON note_helpful_votes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own helpful votes" ON note_helpful_votes
    FOR DELETE
    USING (auth.uid() = user_id);

-- Triggers for incrementing/decrementing helpful_count
CREATE OR REPLACE FUNCTION increment_helpful_count()
RETURNS trigger AS $$
BEGIN
    UPDATE community_notes
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.note_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_increment_helpful_count
    AFTER INSERT ON note_helpful_votes
    FOR EACH ROW
    EXECUTE FUNCTION increment_helpful_count();

CREATE OR REPLACE FUNCTION decrement_helpful_count()
RETURNS trigger AS $$
BEGIN
    UPDATE community_notes
    SET helpful_count = helpful_count - 1
    WHERE id = OLD.note_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_decrement_helpful_count
    AFTER DELETE ON note_helpful_votes
    FOR EACH ROW
    EXECUTE FUNCTION decrement_helpful_count();
