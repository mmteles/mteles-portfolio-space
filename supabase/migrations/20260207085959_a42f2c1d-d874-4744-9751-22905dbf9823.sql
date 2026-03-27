
-- Create a public view that excludes the email column
CREATE VIEW public.profiles_public AS
SELECT 
  id, full_name, title, tagline, bio, photo_url, 
  linkedin_url, github_url, hero_stats, created_at, updated_at
FROM public.profiles;

-- Grant read access on the view to public roles
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Remove the public read policy from the underlying profiles table
-- so email is no longer accessible via direct API queries
DROP POLICY "Anyone can read profiles" ON public.profiles;
