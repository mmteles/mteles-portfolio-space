
-- Drop the existing SECURITY DEFINER view
DROP VIEW IF EXISTS public.profiles_public;

-- Recreate with SECURITY INVOKER
CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT
  id,
  full_name,
  title,
  tagline,
  bio,
  photo_url,
  github_url,
  linkedin_url,
  hero_stats,
  created_at,
  updated_at
FROM public.profiles;

-- Grant SELECT on the view to public roles
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Add a SELECT policy on the base profiles table so the INVOKER view can read
CREATE POLICY "Public can read non-sensitive profile data"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);
