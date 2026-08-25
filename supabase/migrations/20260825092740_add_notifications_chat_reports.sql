/*
# BorrowBefore — Notifications, Chat, Reports, and Review Enhancement

## Overview
Adds in-app notifications, chat between users, user/item reports, and a reviews aggregate view for average ratings.

## New Tables

1. `notifications`
   - In-app notifications for users.
   - `id` (uuid, PK)
   - `user_id` (uuid, references profiles) — the recipient
   - `type` (text) — 'booking_received', 'booking_approved', 'booking_rejected', 'booking_cancelled', 'return_approaching'
   - `title` (text)
   - `message` (text)
   - `booking_id` (uuid, nullable, references bookings)
   - `read` (boolean, default false)
   - `created_at` (timestamptz)

2. `conversations`
   - A chat thread between two users about a specific item.
   - `id` (uuid, PK)
   - `item_id` (uuid, references items)
   - `participant_a` (uuid, references profiles)
   - `participant_b` (uuid, references profiles)
   - `created_at` (timestamptz)
   - Unique constraint on (item_id, participant_a, participant_b)

3. `messages`
   - Individual chat messages within a conversation.
   - `id` (uuid, PK)
   - `conversation_id` (uuid, references conversations)
   - `sender_id` (uuid, references profiles, DEFAULT auth.uid())
   - `body` (text)
   - `read` (boolean, default false)
   - `created_at` (timestamptz)

4. `reports`
   - Users can report items or other users.
   - `id` (uuid, PK)
   - `reporter_id` (uuid, references profiles, DEFAULT auth.uid())
   - `report_type` (text) — 'item' or 'user'
   - `target_id` (uuid) — item_id or user_id being reported
   - `reason` (text)
   - `details` (text, nullable)
   - `created_at` (timestamptz)

5. `item_ratings` (VIEW)
   - Aggregate view computing average rating and review count per item.
   - `item_id`, `avg_rating`, `review_count`

## Security (RLS)
- `notifications`: owner-scoped CRUD (user sees/updates only their own notifications).
- `conversations`: both participants can read; either participant can insert.
- `messages`: both conversation participants can read; sender can insert.
- `reports`: reporter can insert; no reads from client (admin-only).
*/

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  participant_a uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_b uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_conversation UNIQUE (item_id, participant_a, participant_b)
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_conversations" ON conversations;
CREATE POLICY "read_conversations" ON conversations FOR SELECT
  TO authenticated USING (auth.uid() = participant_a OR auth.uid() = participant_b);

DROP POLICY IF EXISTS "insert_conversations" ON conversations;
CREATE POLICY "insert_conversations" ON conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);

-- MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_messages" ON messages;
CREATE POLICY "read_messages" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_messages" ON messages;
CREATE POLICY "insert_messages" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "update_messages" ON messages;
CREATE POLICY "update_messages" ON messages FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

-- REPORTS
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_reports" ON reports;
CREATE POLICY "insert_reports" ON reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- ITEM RATINGS VIEW (aggregate reviews per item)
CREATE OR REPLACE VIEW item_ratings AS
SELECT
  b.item_id,
  COALESCE(AVG(r.rating), 0)::numeric(3,1) AS avg_rating,
  COUNT(r.id)::integer AS review_count
FROM bookings b
LEFT JOIN reviews r ON r.booking_id = b.id
GROUP BY b.item_id;

-- Grant view access
GRANT SELECT ON item_ratings TO authenticated, anon;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_item ON conversations(item_id);
