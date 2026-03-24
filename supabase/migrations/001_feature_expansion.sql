-- =============================================================================
-- Migration 001: Feature Expansion
-- Extends messages and contacts tables; adds labels and quick_replies tables.
-- Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extend messages table
-- -----------------------------------------------------------------------------

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS reply_to_id      TEXT,
  ADD COLUMN IF NOT EXISTS reactions        JSONB        DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS interactive_type TEXT,
  ADD COLUMN IF NOT EXISTS interactive_data JSONB,
  ADD COLUMN IF NOT EXISTS media_url        TEXT,
  ADD COLUMN IF NOT EXISTS transcription    TEXT;

-- Index: look up threads by quoted message ID
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id
  ON messages(reply_to_id)
  WHERE reply_to_id IS NOT NULL;

-- Index: filter by interactive message type
CREATE INDEX IF NOT EXISTS idx_messages_interactive_type
  ON messages(interactive_type)
  WHERE interactive_type IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Extend contacts table
-- -----------------------------------------------------------------------------

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS is_pinned     BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_muted      INTEGER      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_archived   BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_blocked    BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS labels        JSONB        DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_group      BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_jid     TEXT,
  ADD COLUMN IF NOT EXISTS lead_status   TEXT,
  ADD COLUMN IF NOT EXISTS lead_tags     JSONB        DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS lead_notes    TEXT,
  ADD COLUMN IF NOT EXISTS lead_email    TEXT,
  ADD COLUMN IF NOT EXISTS lead_name     TEXT,
  ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;

-- Index: inbox filters — pinned, archived, blocked contacts per instance
CREATE INDEX IF NOT EXISTS idx_contacts_instance_is_pinned
  ON contacts(instance_id, is_pinned)
  WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_contacts_instance_is_archived
  ON contacts(instance_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_contacts_instance_is_blocked
  ON contacts(instance_id, is_blocked)
  WHERE is_blocked = true;

-- Index: CRM pipeline filtering by lead status
CREATE INDEX IF NOT EXISTS idx_contacts_instance_lead_status
  ON contacts(instance_id, lead_status)
  WHERE lead_status IS NOT NULL;

-- Index: group lookups by JID
CREATE INDEX IF NOT EXISTS idx_contacts_group_jid
  ON contacts(group_jid)
  WHERE group_jid IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. New table: labels
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS labels (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID        NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  label_id    TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  color       INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (instance_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_labels_instance_id
  ON labels(instance_id);

ALTER TABLE labels ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'labels'
      AND policyname = 'Enable all operations on labels'
  ) THEN
    CREATE POLICY "Enable all operations on labels"
      ON labels FOR ALL USING (true);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. New table: quick_replies
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS quick_replies (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID        NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  shortcut    TEXT        NOT NULL,
  type        TEXT        DEFAULT 'text',
  text        TEXT,
  file_url    TEXT,
  doc_name    TEXT,
  uazapi_id   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quick_replies_instance_id
  ON quick_replies(instance_id);

-- Index: shortcut lookup for autocomplete (prefix search pattern)
CREATE INDEX IF NOT EXISTS idx_quick_replies_instance_shortcut
  ON quick_replies(instance_id, shortcut);

ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quick_replies'
      AND policyname = 'Enable all operations on quick_replies'
  ) THEN
    CREATE POLICY "Enable all operations on quick_replies"
      ON quick_replies FOR ALL USING (true);
  END IF;
END $$;

-- updated_at trigger for quick_replies
-- update_updated_at_column() is already defined in create-tables.sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_quick_replies_updated_at'
  ) THEN
    CREATE TRIGGER update_quick_replies_updated_at
    BEFORE UPDATE ON quick_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
