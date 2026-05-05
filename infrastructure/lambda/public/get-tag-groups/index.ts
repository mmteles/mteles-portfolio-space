import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { query } from "../../shared/db";
import { ok, serverError } from "../../shared/response";

// Idempotent — creates the table + seeds default groups if they don't exist yet.
// Runs once per cold start; a no-op on a warm table (~1–2 ms overhead).
async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS public.tag_groups (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT        NOT NULL UNIQUE,
      sort_order INTEGER     NOT NULL DEFAULT 0,
      tags       TEXT[]      NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_tag_groups_sort ON public.tag_groups (sort_order)`);
  await query(`
    CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = now(); RETURN NEW; END;
    $$ LANGUAGE plpgsql
  `);
  await query(`
    DO $$ BEGIN
      CREATE TRIGGER trg_tag_groups_updated_at
        BEFORE UPDATE ON public.tag_groups
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await query(`
    INSERT INTO public.tag_groups (name, sort_order, tags) VALUES
      ('AI & ML',             0, ARRAY['AI','ML','Machine Learning','LLM','GPT','RAG','OpenAI','Langchain','LangChain','NLP','Computer Vision','Deep Learning','TensorFlow','PyTorch','Anthropic','Claude','Embedding','Vector','Generative AI','Prompt Engineering','Hugging Face','Stable Diffusion','ChatGPT']),
      ('Web & Frontend',      1, ARRAY['React','TypeScript','JavaScript','Vue','Angular','Next.js','Tailwind','CSS','HTML','Vite','Svelte','shadcn','Framer Motion','Three.js','WebGL']),
      ('Backend & APIs',      2, ARRAY['Node.js','Python','FastAPI','Django','Flask','Express','REST','GraphQL','API','Supabase','Firebase','tRPC','WebSocket','gRPC']),
      ('Cloud & DevOps',      3, ARRAY['AWS','Azure','GCP','Docker','Kubernetes','CI/CD','Terraform','Cloud','Serverless','GitHub Actions','Vercel','Netlify','Railway']),
      ('Data & Analytics',    4, ARRAY['PostgreSQL','MongoDB','Redis','MySQL','SQLite','Analytics','Power BI','Tableau','ETL','Pandas','NumPy','Databricks','Snowflake']),
      ('Business & Strategy', 5, ARRAY['Project Management','Consulting','Strategy','Finance','Healthcare','Agile','Scrum','PMO','Digital Transformation','Process Improvement'])
    ON CONFLICT (name) DO NOTHING
  `);
}

let schemaReady = false;

export const handler = async (
  _event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!schemaReady) {
      await ensureSchema();
      schemaReady = true;
    }
    const rows = await query(`
      SELECT id, name, sort_order, tags
      FROM tag_groups
      ORDER BY sort_order ASC, name ASC
    `);
    return ok(rows);
  } catch (err) {
    return serverError(err);
  }
};
