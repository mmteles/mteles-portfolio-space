import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, GraduationCap, ChevronDown } from "lucide-react";
import { useTimeline } from "@/hooks/useTimeline";
import { cn } from "@/lib/utils";

type FilterType = "all" | "work" | "education";

export default function TimelineSection() {
  const { data: entries = [] } = useTimeline();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>("all");

  const workCount = entries.filter((e) => e.entry_type === "work").length;
  const eduCount = entries.filter((e) => e.entry_type === "education").length;

  const filtered =
    filter === "all" ? entries : entries.filter((e) => e.entry_type === filter);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const tabs: { id: FilterType; label: string; count: number }[] = [
    { id: "all", label: "All", count: entries.length },
    { id: "work", label: "Experience", count: workCount },
    { id: "education", label: "Education", count: eduCount },
  ];

  return (
    <section
      id="experience"
      className="py-24 bg-muted/30 border-t border-border scroll-mt-14"
    >
      <div className="section-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-600 dark:text-indigo-400 mb-3">
            Career
          </p>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-8">
            Experience & Education
          </h2>

          {/* Filter pills */}
          <div className="flex gap-1 bg-muted rounded-full p-1 w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                  filter === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={cn(
                      "ml-1.5 text-xs",
                      filter === tab.id
                        ? "text-muted-foreground"
                        : "text-muted-foreground/50"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Entry list */}
        <div className="space-y-3">
          <AnimatePresence mode="sync">
            {filtered.map((entry, index) => {
              const isWork = entry.entry_type === "work";
              const Icon = isWork ? Briefcase : GraduationCap;
              const isExpanded = expandedIds.has(entry.id);

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.04 }}
                >
                  <div
                    className="bg-card rounded-xl border border-border cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                    style={{
                      borderLeftWidth: "4px",
                      borderLeftColor: isWork
                        ? "rgb(99 102 241)"
                        : "rgb(16 185 129)",
                    }}
                    onClick={() => toggleExpand(entry.id)}
                  >
                    <div className="p-5 md:p-6">
                      <div className="flex items-start gap-4">
                        {/* Type icon */}
                        <div
                          className={cn(
                            "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center mt-0.5",
                            isWork
                              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                              <h3 className="text-base font-semibold text-foreground leading-snug">
                                {entry.title}
                              </h3>
                              <p
                                className={cn(
                                  "text-sm font-medium mt-0.5",
                                  isWork
                                    ? "text-indigo-600 dark:text-indigo-400"
                                    : "text-emerald-600 dark:text-emerald-400"
                                )}
                              >
                                {entry.organization}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 pt-0.5">
                              {entry.start_date}
                              {" — "}
                              {entry.end_date || "Present"}
                            </span>
                          </div>
                        </div>

                        {/* Expand indicator */}
                        <ChevronDown
                          className={cn(
                            "shrink-0 h-4 w-4 text-muted-foreground/40 transition-transform duration-200 mt-0.5",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </div>

                      {/* Expandable description */}
                      <AnimatePresence initial={false}>
                        {isExpanded && entry.description && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <p className="text-sm text-muted-foreground leading-relaxed mt-4 pt-4 pl-14 border-t border-border">
                              {entry.description}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-muted-foreground py-16"
          >
            {entries.length === 0
              ? "Experience and education entries will appear here once added via the admin panel."
              : "No entries match this filter."}
          </motion.p>
        )}
      </div>
    </section>
  );
}
