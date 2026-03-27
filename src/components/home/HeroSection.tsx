import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, Linkedin, Github } from "lucide-react";
import { Link } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";

export default function HeroSection() {
  const { data: profile } = useProfile();

  const scrollToTimeline = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("experience")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="bg-background pt-28 pb-16">
      <div className="section-container">
        <div className="grid md:grid-cols-5 gap-10 items-center">
          {/* Main text */}
          <motion.div
            className="md:col-span-3"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-600 dark:text-indigo-400 mb-6">
              Portfolio
            </p>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold leading-[1.05] text-foreground mb-5 tracking-tight">
              {profile?.full_name || "Mauricio Marcon Teles"}
            </h1>
            <p className="text-lg text-muted-foreground font-light mb-3">
              {profile?.title ||
                "Technical Project Manager · Solutions Architect · AI Developer"}
            </p>
            <p className="text-base text-muted-foreground leading-relaxed mb-9 max-w-md">
              {profile?.tagline ||
                "Building intelligent solutions at the intersection of technology and business strategy."}
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-9">
              <a
                href="#experience"
                onClick={scrollToTimeline}
                className="inline-flex items-center gap-2 bg-foreground text-background text-sm font-medium px-5 py-2.5 rounded-full hover:bg-foreground/85 transition-colors"
              >
                View Timeline
                <ArrowDown className="h-3.5 w-3.5" />
              </a>
              <Link
                to="/projects"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-border rounded-full px-5 py-2.5 hover:border-foreground/30"
              >
                Projects
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex items-center gap-4">
              {profile?.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {profile?.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="h-4 w-4" />
                </a>
              )}
            </div>
          </motion.div>

          {/* Photo */}
          <motion.div
            className="hidden md:flex md:col-span-2 justify-end"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            {profile?.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.full_name || "Profile"}
                className="w-60 h-60 lg:w-72 lg:h-72 rounded-2xl object-cover shadow-lg"
              />
            ) : (
              <div className="w-60 h-60 lg:w-72 lg:h-72 rounded-2xl bg-muted flex items-center justify-center">
                <span className="text-7xl font-serif text-muted-foreground/25">
                  {(profile?.full_name || "M")[0]}
                </span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Stats row */}
        {profile?.hero_stats && (profile.hero_stats as Array<{ value: string; label: string }>).length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-14 pt-8 border-t border-border flex flex-wrap gap-8 md:gap-14"
          >
            {(profile.hero_stats as Array<{ value: string; label: string }>).map(
              (stat, i) => (
                <div key={i}>
                  <p className="text-3xl font-bold font-serif text-foreground leading-none">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">
                    {stat.label}
                  </p>
                </div>
              )
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}
