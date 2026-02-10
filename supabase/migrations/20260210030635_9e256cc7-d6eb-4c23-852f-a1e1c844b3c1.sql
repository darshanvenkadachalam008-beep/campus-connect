
-- Add capacity and deadline columns to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_capacity integer DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_deadline timestamp with time zone DEFAULT NULL;

-- Update status to support full lifecycle (using text, so no enum change needed)
-- Valid statuses: draft, published, upcoming, registration_closed, live, ongoing, completed

-- Create waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  promoted_at timestamp with time zone DEFAULT NULL,
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can join waitlist" ON public.waitlist FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own waitlist" ON public.waitlist FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can leave waitlist" ON public.waitlist FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Organizers can view event waitlist" ON public.waitlist FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE events.id = waitlist.event_id AND events.organizer_id = auth.uid())
);

-- Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- Create event_analytics table for tracking views
CREATE TABLE IF NOT EXISTS public.event_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.event_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert views" ON public.event_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Organizers can view event analytics" ON public.event_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE events.id = event_views.event_id AND events.organizer_id = auth.uid())
);

-- Add email to profiles for easy access
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text DEFAULT '';

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
