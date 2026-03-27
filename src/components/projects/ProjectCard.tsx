import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { Project } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";

export type ViewMode = "list" | "grid-sm" | "grid-lg";

interface ProjectCardProps {
  project: Project;
  index: number;
  viewMode: ViewMode;
}

function Thumbnail({
  url,
  title,
  className,
  textSize = "text-3xl",
}: {
  url: string | null;
  title: string;
  className: string;
  textSize?: string;
}) {
  return (
    <div className={cn("overflow-hidden bg-muted shrink-0", className)}>
      {url ? (
        <img
          src={url}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className={cn("font-serif text-muted-foreground/25", textSize)}>
            {title[0]}
          </span>
        </div>
      )}
    </div>
  );
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
      {tag}
    </span>
  );
}

export default function ProjectCard({ project, index, viewMode }: ProjectCardProps) {
  const delay = Math.min(index * 0.05, 0.25);

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay }}
      >
        <Link
          to={`/projects/${project.id}`}
          className="group flex items-center gap-4 bg-card rounded-xl border border-border p-3 hover:shadow-sm transition-shadow"
        >
          <Thumbnail
            url={project.thumbnail_url}
            title={project.title}
            className="w-16 h-16 rounded-lg"
            textSize="text-xl"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground leading-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {project.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {project.short_description}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {project.tags.slice(0, 3).map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
            {project.tags.length > 3 && (
              <span className="text-[11px] text-muted-foreground/50">
                +{project.tags.length - 3}
              </span>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
        </Link>
      </motion.div>
    );
  }

  if (viewMode === "grid-sm") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay }}
      >
        <Link
          to={`/projects/${project.id}`}
          className="group block bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow"
        >
          <Thumbnail
            url={project.thumbnail_url}
            title={project.title}
            className="w-full aspect-[4/3]"
            textSize="text-2xl"
          />
          <div className="p-3">
            <h3 className="font-semibold text-sm text-foreground leading-tight mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
              {project.title}
            </h3>
            <div className="flex flex-wrap gap-1">
              {project.tags.slice(0, 2).map((tag) => (
                <TagPill key={tag} tag={tag} />
              ))}
              {project.tags.length > 2 && (
                <span className="text-[11px] text-muted-foreground/50">
                  +{project.tags.length - 2}
                </span>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // grid-lg (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
    >
      <Link
        to={`/projects/${project.id}`}
        className="group block bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow"
      >
        <Thumbnail
          url={project.thumbnail_url}
          title={project.title}
          className="w-full aspect-video group-hover:[&_img]:scale-105 [&_img]:transition-transform [&_img]:duration-300"
          textSize="text-4xl"
        />
        <div className="p-5">
          <h3 className="font-semibold text-base text-foreground mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {project.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {project.short_description}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {project.tags.slice(0, 4).map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
            {project.tags.length > 4 && (
              <span className="text-[11px] text-muted-foreground/50">
                +{project.tags.length - 4}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
