-- Direct Messages System
-- Enables 1-to-1 chat between users with mutual follow

-- Conversations table: stores pairs of users
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT conversations_unique_pair UNIQUE(user_a_id, user_b_id),
  CONSTRAINT conversations_canonical_order CHECK (user_a_id < user_b_id)
);

-- Direct messages table
CREATE TABLE direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  read_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT dm_content_length CHECK (char_length(content) BETWEEN 1 AND 500)
);

-- Indexes for conversations
CREATE INDEX idx_conversations_user_a ON conversations(user_a_id);
CREATE INDEX idx_conversations_user_b ON conversations(user_b_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- Indexes for direct_messages
CREATE INDEX idx_dm_conversation_created ON direct_messages(conversation_id, created_at DESC);
CREATE INDEX idx_dm_unread ON direct_messages(conversation_id) WHERE read_at IS NULL;
CREATE INDEX idx_dm_sender ON direct_messages(sender_id);

-- RLS: permissive policies (real protection in API routes via service_role)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_select_all ON conversations FOR SELECT USING (true);
CREATE POLICY conversations_insert_all ON conversations FOR INSERT WITH CHECK (true);
CREATE POLICY conversations_update_all ON conversations FOR UPDATE USING (true);
CREATE POLICY conversations_delete_all ON conversations FOR DELETE USING (true);

CREATE POLICY direct_messages_select_all ON direct_messages FOR SELECT USING (true);
CREATE POLICY direct_messages_insert_all ON direct_messages FOR INSERT WITH CHECK (true);
CREATE POLICY direct_messages_update_all ON direct_messages FOR UPDATE USING (true);
CREATE POLICY direct_messages_delete_all ON direct_messages FOR DELETE USING (true);

-- Trigger function: update last_message_at when new message is inserted
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dm_update_last_message
AFTER INSERT ON direct_messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Enable realtime for direct_messages (for live chat updates)
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
