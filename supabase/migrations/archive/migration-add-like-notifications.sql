-- Migration to add like notifications functionality for BESHY Whisper

-- Create push_tokens table to store user notification preferences and tokens
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT,
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Only one active token per user for now
  UNIQUE(user_id)
);

-- Add row level security
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Policies for push_tokens table
CREATE POLICY "Users can manage their own push tokens" 
  ON public.push_tokens FOR ALL 
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON public.push_tokens(user_id);

-- Create notifications table to track sent notifications and prevent duplicates
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'like', 'comment', 'reminder', etc.
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB, -- Additional data like entry_id, liker_user_id, etc.
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add row level security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications table
CREATE POLICY "Users can read their own notifications" 
  ON public.notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" 
  ON public.notifications FOR INSERT 
  WITH CHECK (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON public.notifications(type);
CREATE INDEX IF NOT EXISTS notifications_sent_at_idx ON public.notifications(sent_at);

-- Function to send like notification
CREATE OR REPLACE FUNCTION send_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  entry_owner_id UUID;
  liker_name TEXT;
  liker_display_id TEXT;
  entry_message TEXT;
  notification_title TEXT;
  notification_body TEXT;
BEGIN
  -- Get the entry owner's user_id and entry details
  SELECT e.user_id, e.mensaje 
  INTO entry_owner_id, entry_message
  FROM public.entries e 
  WHERE e.id = NEW.entry_id;
  
  -- Don't send notification if user likes their own post
  IF entry_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get the liker's display name and ID
  SELECT u.name, u.bsy_id 
  INTO liker_name, liker_display_id
  FROM public.users u 
  WHERE u.id = NEW.user_id;
  
  -- Use fallback if display names are not available
  IF liker_name IS NULL THEN
    liker_name := 'Alguien';
  END IF;
  
  -- Create notification title and body
  notification_title := liker_name || ' le ha gustado tu Whisper';
  notification_body := COALESCE(
    CASE 
      WHEN LENGTH(entry_message) > 50 THEN LEFT(entry_message, 50) || '...'
      ELSE entry_message
    END,
    'Tu whisper'
  );
  
  -- Insert notification record
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data
  ) VALUES (
    entry_owner_id,
    'like',
    notification_title,
    notification_body,
    jsonb_build_object(
      'entry_id', NEW.entry_id,
      'liker_user_id', NEW.user_id,
      'liker_name', liker_name,
      'liker_display_id', liker_display_id
    )
  );
  
  -- Send push notification asynchronously using pg_notify
  -- This will be handled by a background process or webhook
  PERFORM pg_notify('like_notification', jsonb_build_object(
    'user_id', entry_owner_id,
    'title', notification_title,
    'body', notification_body,
    'data', jsonb_build_object(
      'entry_id', NEW.entry_id,
      'liker_user_id', NEW.user_id,
      'liker_name', liker_name,
      'liker_display_id', liker_display_id
    )
  )::text);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for like notifications
DROP TRIGGER IF EXISTS trigger_like_notification ON public.likes;
CREATE TRIGGER trigger_like_notification
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION send_like_notification();

-- Function to clean old notifications (optional - can be called by a cron job)
CREATE OR REPLACE FUNCTION clean_old_notifications()
RETURNS void AS $$
BEGIN
  -- Delete notifications older than 30 days
  DELETE FROM public.notifications 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;