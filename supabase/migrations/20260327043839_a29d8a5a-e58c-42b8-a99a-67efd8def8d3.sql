
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role helper function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table (single row for portfolio owner)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  tagline TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  photo_url TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  hero_stats JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Public view excluding email
CREATE VIEW public.profiles_public AS
  SELECT id, full_name, title, tagline, bio, photo_url, linkedin_url, github_url, hero_stats
  FROM public.profiles;

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  features JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  demo_url TEXT DEFAULT '',
  github_url TEXT DEFAULT '',
  thumbnail_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Project media table
CREATE TABLE public.project_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  alt TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_media ENABLE ROW LEVEL SECURITY;

-- Timeline entries table
CREATE TABLE public.timeline_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  entry_type TEXT NOT NULL DEFAULT 'work',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.timeline_entries ENABLE ROW LEVEL SECURITY;

-- Contact messages table
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- profiles: anyone can read, admin can update
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- projects: anyone can read published, admin full access
CREATE POLICY "Anyone can view published projects" ON public.projects FOR SELECT USING (published = true);
CREATE POLICY "Admins can do anything with projects" ON public.projects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- project_media: anyone can read, admin full access
CREATE POLICY "Anyone can view project media" ON public.project_media FOR SELECT USING (true);
CREATE POLICY "Admins can manage project media" ON public.project_media FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- timeline_entries: anyone can read, admin full access
CREATE POLICY "Anyone can view timeline" ON public.timeline_entries FOR SELECT USING (true);
CREATE POLICY "Admins can manage timeline" ON public.timeline_entries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- contact_messages: anyone can insert, admin can read/update
CREATE POLICY "Anyone can send messages" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view messages" ON public.contact_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update messages" ON public.contact_messages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles: admin can read
CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- Grant access to the public view
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('project-media', 'project-media', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('resume', 'resume', true) ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Public read project-media" ON storage.objects FOR SELECT USING (bucket_id = 'project-media');
CREATE POLICY "Admin upload project-media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete project-media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'project-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public read resume" ON storage.objects FOR SELECT USING (bucket_id = 'resume');
CREATE POLICY "Admin upload resume" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resume' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete resume" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'resume' AND public.has_role(auth.uid(), 'admin'));
