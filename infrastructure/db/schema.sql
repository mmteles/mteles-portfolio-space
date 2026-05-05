-- =============================================================================
-- Portfolio AWS PostgreSQL Schema
-- Target: RDS PostgreSQL 16 (db.t4g.micro)
-- NO RLS — security is enforced at the Lambda API layer via Cognito JWT.
-- =============================================================================

-- Ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUM
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT,                            -- Cognito sub (optional reference)
  full_name    TEXT,
  title        TEXT,
  tagline      TEXT,
  bio          TEXT,
  photo_url    TEXT,
  linkedin_url TEXT,
  github_url   TEXT,
  email        TEXT,
  hero_stats   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT        NOT NULL,
  short_description TEXT,
  description       TEXT,
  features          JSONB       NOT NULL DEFAULT '[]'::jsonb,
  tags              TEXT[]      NOT NULL DEFAULT '{}',
  demo_url          TEXT,
  github_url        TEXT,
  thumbnail_url     TEXT,
  sort_order        INTEGER     NOT NULL DEFAULT 0,
  published         BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_media (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  url        TEXT        NOT NULL,
  alt        TEXT,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.timeline_entries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  organization TEXT        NOT NULL,
  start_date   DATE        NOT NULL,
  end_date     DATE,
  description  TEXT,
  entry_type   TEXT        NOT NULL DEFAULT 'work' CHECK (entry_type IN ('work', 'education')),
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  subject    TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_roles: maps Cognito sub → role (used if you want DB-level role checks)
-- NOTE: For a solo portfolio, the Cognito "admin" group is sufficient.
--       This table is optional but kept for future extensibility.
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cognito_sub TEXT        NOT NULL UNIQUE,   -- Cognito user sub
  role        app_role    NOT NULL DEFAULT 'user',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- tag_groups: user-defined groupings for the project filter UI.
-- tags[] contains tag strings that belong to this group; order matters for display.
-- Tags used by projects but absent from every group are shown as "Other" on the frontend.
CREATE TABLE IF NOT EXISTS public.tag_groups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL UNIQUE,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  tags       TEXT[]      NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the default groups (idempotent — skipped if name already exists)
INSERT INTO public.tag_groups (name, sort_order, tags) VALUES
  ('AI & ML',             0, ARRAY['AI','ML','Machine Learning','LLM','GPT','RAG','OpenAI','Langchain','LangChain','NLP','Computer Vision','Deep Learning','TensorFlow','PyTorch','Anthropic','Claude','Embedding','Vector','Generative AI','Prompt Engineering','Hugging Face','Stable Diffusion','ChatGPT']),
  ('Web & Frontend',      1, ARRAY['React','TypeScript','JavaScript','Vue','Angular','Next.js','Tailwind','CSS','HTML','Vite','Svelte','shadcn','Framer Motion','Three.js','WebGL']),
  ('Backend & APIs',      2, ARRAY['Node.js','Python','FastAPI','Django','Flask','Express','REST','GraphQL','API','Supabase','Firebase','tRPC','WebSocket','gRPC']),
  ('Cloud & DevOps',      3, ARRAY['AWS','Azure','GCP','Docker','Kubernetes','CI/CD','Terraform','Cloud','Serverless','GitHub Actions','Vercel','Netlify','Railway']),
  ('Data & Analytics',    4, ARRAY['PostgreSQL','MongoDB','Redis','MySQL','SQLite','Analytics','Power BI','Tableau','ETL','Pandas','NumPy','Databricks','Snowflake']),
  ('Business & Strategy', 5, ARRAY['Project Management','Consulting','Strategy','Finance','Healthcare','Agile','Scrum','PMO','Digital Transformation','Process Improvement'])
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_projects_published_sort   ON public.projects (published, sort_order);
CREATE INDEX IF NOT EXISTS idx_tag_groups_sort           ON public.tag_groups (sort_order);
CREATE INDEX IF NOT EXISTS idx_project_media_project_id  ON public.project_media (project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_timeline_sort             ON public.timeline_entries (sort_order, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_contact_email_created     ON public.contact_messages (email, created_at);
CREATE INDEX IF NOT EXISTS idx_contact_is_read           ON public.contact_messages (is_read, created_at DESC);

-- ---------------------------------------------------------------------------
-- TRIGGERS: auto-update updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_timeline_updated_at
    BEFORE UPDATE ON public.timeline_entries
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_tag_groups_updated_at
    BEFORE UPDATE ON public.tag_groups
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- GRANT permissions to the application user
-- (Run after creating the DB user, e.g.: CREATE USER portfolio_app WITH PASSWORD '...')
-- ---------------------------------------------------------------------------

-- GRANT CONNECT ON DATABASE portfolio TO portfolio_app;
-- GRANT USAGE ON SCHEMA public TO portfolio_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO portfolio_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO portfolio_app;
