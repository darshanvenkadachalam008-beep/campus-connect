
-- QR token for events (secure, time-bound)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS qr_token text DEFAULT NULL;

-- Attendance tracking table
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checked_in_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view event attendance" ON public.attendance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = attendance.event_id AND events.organizer_id = auth.uid())
  );

CREATE POLICY "Users can view own attendance" ON public.attendance
  FOR SELECT USING (user_id = auth.uid());

-- Certificates table (metadata only, no file storage)
CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  certificate_number text NOT NULL UNIQUE,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  emailed_at timestamp with time zone DEFAULT NULL,
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own certificates" ON public.certificates
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Organizers can view event certificates" ON public.certificates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = certificates.event_id AND events.organizer_id = auth.uid())
  );
