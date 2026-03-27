
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create profiles table (single row for portfolio owner)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  tagline TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  email TEXT,
  hero_stats JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  features JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  demo_url TEXT,
  github_url TEXT,
  thumbnail_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 6. Create project_media table
CREATE TABLE public.project_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'image',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.project_media ENABLE ROW LEVEL SECURITY;

-- 7. Create timeline_entries table
CREATE TABLE public.timeline_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  description TEXT NOT NULL DEFAULT '',
  entry_type TEXT NOT NULL DEFAULT 'work' CHECK (entry_type IN ('work', 'education')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.timeline_entries ENABLE ROW LEVEL SECURITY;

-- 8. Create contact_messages table
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- 9. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 10. Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_timeline_entries_updated_at
  BEFORE UPDATE ON public.timeline_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. RLS Policies

-- user_roles: admin-only access
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- profiles: public read, admin write
CREATE POLICY "Anyone can read profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- projects: public read (published only), admin full access
CREATE POLICY "Anyone can read published projects" ON public.projects
  FOR SELECT USING (published = true);

CREATE POLICY "Admins can manage projects" ON public.projects
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- project_media: public read, admin write
CREATE POLICY "Anyone can read project media" ON public.project_media
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage project media" ON public.project_media
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- timeline_entries: public read, admin write
CREATE POLICY "Anyone can read timeline entries" ON public.timeline_entries
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage timeline entries" ON public.timeline_entries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- contact_messages: public insert, admin read/update
CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read contact messages" ON public.contact_messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update contact messages" ON public.contact_messages
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 12. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('project-media', 'project-media', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('resume', 'resume', true);

-- 13. Storage policies
CREATE POLICY "Public can read project media files" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-media');

CREATE POLICY "Admins can upload project media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete project media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'project-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read resume files" ON storage.objects
  FOR SELECT USING (bucket_id = 'resume');

CREATE POLICY "Admins can upload resume" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resume' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete resume" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'resume' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update resume" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'resume' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'resume' AND public.has_role(auth.uid(), 'admin'));
