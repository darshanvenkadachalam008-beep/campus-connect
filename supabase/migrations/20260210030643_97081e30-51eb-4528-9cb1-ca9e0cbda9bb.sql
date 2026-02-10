
-- Fix overly permissive policy on event_views
DROP POLICY IF EXISTS "Anyone can insert views" ON public.event_views;
CREATE POLICY "Authenticated users can insert views" ON public.event_views FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
