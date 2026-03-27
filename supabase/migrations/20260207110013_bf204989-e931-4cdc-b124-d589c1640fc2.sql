-- Remove the public SELECT policy from profiles table to prevent email exposure
-- Public access is handled via the profiles_public view which excludes the email column
DROP POLICY "Public can read non-sensitive profile data" ON public.profiles;