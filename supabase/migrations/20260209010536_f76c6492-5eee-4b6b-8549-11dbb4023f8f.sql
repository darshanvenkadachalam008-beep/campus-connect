-- Add category column to events table
ALTER TABLE public.events 
ADD COLUMN category TEXT NOT NULL DEFAULT 'workshop' 
CHECK (category IN ('workshop', 'seminar', 'fest', 'meetup', 'other'));

-- Create index for faster category filtering
CREATE INDEX idx_events_category ON public.events(category);