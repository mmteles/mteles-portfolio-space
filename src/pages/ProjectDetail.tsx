import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Github } from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useProject, useProjectMedia } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";

// ─── Rich text renderer ────────────────────────────────────────────────────────
// Supports: blank line = paragraph break, `- ` / `• ` / `* ` = bullet,
//           `# ` = h2,  `## ` = h3
function renderRichText(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  const bulletBuffer: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return;
    elements.push(
      <ul key={key++} className="my-3 space-y-2">
        {bulletBuffer.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-muted-foreground text-base leading-relaxed">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
    bulletBuffer.length = 0;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushBullets();
      continue;
    }

    if (/^[-•*]\s+/.test(trimmed)) {
      bulletBuffer.push(trimmed.replace(/^[-•*]\s+/, ""));
      continue;
    }

    flushBullets();

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h3 key={key++} className="text-lg font-semibold font-serif text-foreground mt-7 mb-2">
          {trimmed.slice(3)}
        </h3>
      );
    } else if (trimmed.startsWith("# ")) {
      elements.push(
        <h2 key={key++} className="text-xl font-semibold font-serif text-foreground mt-8 mb-3">
          {trimmed.slice(2)}
        </h2>
      );
    } else {
      elements.push(
        <p key={key++} className="text-base text-muted-foreground leading-relaxed mb-3">
          {trimmed}
        </p>
      );
    }
  }

  flushBullets();
  return elements;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id || "");
  const { data: media = [] } = useProjectMedia(id || "");

  if (isLoading) {
    return (
      <Layout>
        <div className="section-container max-w-4xl pt-28 pb-20 space-y-4">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-12 w-3/4 bg-muted rounded animate-pulse" />
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="section-container pt-28 py-20 text-center">
          <p className="text-muted-foreground mb-4">Project not found.</p>
          <Button asChild variant="outline">
            <Link to="/projects">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <article className="pt-24 pb-20 bg-background">
        <div className="section-container max-w-3xl">
          {/* Back link */}
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Projects
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            {/* Hero thumbnail */}
            {project.thumbnail_url && (
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-muted mb-8 shadow-sm">
                <img
                  src={project.thumbnail_url}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4 leading-tight">
              {project.title}
            </h1>

            {/* Tags */}
            {project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-6">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* CTA links */}
            {(project.demo_url || project.github_url) && (
              <div className="flex gap-3 mb-10">
                {project.demo_url && (
                  <a
                    href={project.demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-foreground text-background text-sm font-medium px-4 py-2 rounded-full hover:bg-foreground/85 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Live Demo
                  </a>
                )}
                {project.github_url && (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-border text-sm font-medium px-4 py-2 rounded-full hover:border-foreground/30 hover:text-foreground text-muted-foreground transition-colors"
                  >
                    <Github className="h-3.5 w-3.5" />
                    Source Code
                  </a>
                )}
              </div>
            )}

            {/* Description — rendered as structured rich text */}
            {project.description && (
              <div className="mb-10 border-t border-border pt-8">
                {renderRichText(project.description)}
              </div>
            )}

            {/* Key features */}
            {project.features.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-serif font-semibold text-foreground mb-4">
                  Key Features
                </h2>
                <ul className="space-y-2.5">
                  {project.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-muted-foreground text-base leading-relaxed"
                    >
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Media gallery */}
            {media.length > 0 && (
              <div>
                <h2 className="text-lg font-serif font-semibold text-foreground mb-4">
                  Gallery
                </h2>
                <div className={cn("gap-4", media.length === 1 ? "block" : "grid sm:grid-cols-2")}>
                  {media.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl overflow-hidden border border-border bg-muted"
                    >
                      {item.file_type === "video" ? (
                        <video src={item.file_url} controls className="w-full" />
                      ) : (
                        <img
                          src={item.file_url}
                          alt=""
                          className="w-full h-auto"
                          loading="lazy"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </article>
    </Layout>
  );
}
