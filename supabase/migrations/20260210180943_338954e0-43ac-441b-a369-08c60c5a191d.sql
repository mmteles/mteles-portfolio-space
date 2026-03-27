-- Recreate the profiles_public view WITHOUT security_invoker so anon users can read public profile data
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
  SELECT id, full_name, title, tagline, bio, photo_url, linkedin_url, github_url, hero_stats, created_at, updated_at
  FROM public.profiles;