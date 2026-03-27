
-- Fix security definer view
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public WITH (security_invoker = true) AS
  SELECT id, full_name, title, tagline, bio, photo_url, linkedin_url, github_url, hero_stats
  FROM public.profiles;
GRANT SELECT ON public.profiles_public TO anon, authenticated;
