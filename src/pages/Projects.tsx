import { useState, useMemo } from "react";
import { Search, List, LayoutGrid, Grid2x2, X } from "lucide-react";
import Layout from "@/components/layout/Layout";
import ProjectCard, { type ViewMode } from "@/components/projects/ProjectCard";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";

// ─── Tag grouping ─────────────────────────────────────────────────────────────
const TAG_GROUPS: Record<string, string[]> = {
  "AI & ML": [
    "AI", "ML", "Machine Learning", "LLM", "GPT", "RAG", "OpenAI", "Langchain",
    "LangChain", "NLP", "Computer Vision", "Deep Learning", "TensorFlow", "PyTorch",
    "Anthropic", "Claude", "Embedding", "Vector", "Generative AI", "Prompt Engineering",
    "Hugging Face", "Stable Diffusion", "ChatGPT",
  ],
  "Web & Frontend": [
    "React", "TypeScript", "JavaScript", "Vue", "Angular", "Next.js", "Tailwind",
    "CSS", "HTML", "Vite", "Svelte", "shadcn", "Framer Motion", "Three.js", "WebGL",
  ],
  "Backend & APIs": [
    "Node.js", "Python", "FastAPI", "Django", "Flask", "Express", "REST", "GraphQL",
    "API", "Supabase", "Firebase", "tRPC", "WebSocket", "gRPC",
  ],
  "Cloud & DevOps": [
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "Terraform", "Cloud",
    "Serverless", "GitHub Actions", "Vercel", "Netlify", "Railway",
  ],
  "Data & Analytics": [
    "PostgreSQL", "MongoDB", "Redis", "MySQL", "SQLite", "Analytics", "Power BI",
    "Tableau", "ETL", "Pandas", "NumPy", "Databricks", "Snowflake",
  ],
  "Business & Strategy": [
    "Project Management", "Consulting", "Strategy", "Finance", "Healthcare",
    "Agile", "Scrum", "PMO", "Digital Transformation", "Process Improvement",
  ],
};

function getTagGroup(tag: string): string {
  for (const [group, tags] of Object.entries(TAG_GROUPS)) {
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return group;
  }
  return "Other";
}

const GROUP_ORDER = [...Object.keys(TAG_GROUPS), "Other"];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Projects() {
  const { data: projects = [], isLoading } = useProjects();
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem("projectViewMode") as ViewMode) || "grid-lg";
  });

  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("projectViewMode", mode);
  };

  // All unique tags from projects
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    projects.forEach((p) => p.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [projects]);

  // Tags organised into groups (only groups that have at least one tag)
  const groupedTags = useMemo(() => {
    const groups: Record<string, string[]> = {};
    allTags.forEach((tag) => {
      const group = getTagGroup(tag);
      if (!groups[group]) groups[group] = [];
      groups[group].push(tag);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      return GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b);
    });
  }, [allTags]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        p.title.toLowerCase().includes(q) ||
        p.short_description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      const matchTag = !activeTag || p.tags.includes(activeTag);
      return matchSearch && matchTag;
    });
  }, [projects, search, activeTag]);

  const gridClass =
    viewMode === "list"
      ? "space-y-2"
      : viewMode === "grid-sm"
      ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
      : "grid sm:grid-cols-2 lg:grid-cols-3 gap-6";

  return (
    <Layout>
      <section className="pt-24 pb-20 bg-background">
        <div className="section-container">
          {/* Header */}
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-600 dark:text-indigo-400 mb-3">
            Portfolio
          </p>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-8">
            Projects
          </h1>

          {/* Search + View toggle row */}
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search projects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1 shrink-0">
              <button
                onClick={() => handleViewMode("list")}
                title="List view"
                className={cn(
                  "p-1.5 rounded transition-colors",
                  viewMode === "list"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleViewMode("grid-sm")}
                title="Small grid"
                className={cn(
                  "p-1.5 rounded transition-colors",
                  viewMode === "grid-sm"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleViewMode("grid-lg")}
                title="Large grid"
                className={cn(
                  "p-1.5 rounded transition-colors",
                  viewMode === "grid-lg"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Grid2x2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Grouped tag filters */}
          {groupedTags.length > 0 && (
            <div className="mb-8 rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              {/* Clear active filter */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Filter by tag
                </span>
                {activeTag && (
                  <button
                    onClick={() => setActiveTag(null)}
                    className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <X className="h-3 w-3" />
                    Clear filter
                  </button>
                )}
              </div>

              {groupedTags.map(([group, tags]) => (
                <div key={group} className="flex items-start gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 pt-1 w-20 shrink-0 leading-tight">
                    {group}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() =>
                          setActiveTag(tag === activeTag ? null : tag)
                        }
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
                          activeTag === tag
                            ? "bg-indigo-600 text-white dark:bg-indigo-500"
                            : "bg-muted text-muted-foreground hover:text-foreground hover:bg-border"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Result count */}
          {(search || activeTag) && (
            <p className="text-xs text-muted-foreground mb-4">
              {filtered.length === 0
                ? "No results"
                : `${filtered.length} of ${projects.length} project${
                    projects.length !== 1 ? "s" : ""
                  }`}
            </p>
          )}

          {/* Project list / grid */}
          {isLoading ? (
            <div className={gridClass}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "bg-muted rounded-xl animate-pulse",
                    viewMode === "list" ? "h-16" : viewMode === "grid-sm" ? "h-44" : "h-64"
                  )}
                />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className={gridClass}>
              {filtered.map((project, i) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={i}
                  viewMode={viewMode}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-16">
              {projects.length === 0
                ? "Projects will appear here once added via the admin panel."
                : "No projects match your search."}
            </p>
          )}
        </div>
      </section>
    </Layout>
  );
}
