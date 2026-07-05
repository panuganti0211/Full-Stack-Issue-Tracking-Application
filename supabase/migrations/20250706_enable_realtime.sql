-- Run in Supabase Dashboard → SQL Editor
-- Enables live updates for comments and notifications

ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
