import { Linkedin, Github, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Footer() {
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles_public" as any)
        .select("*")
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="section-container py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-serif text-base font-bold">
            {profile?.full_name || "Mauricio Marcon Teles"}
          </p>
          <p className="text-xs opacity-60 mt-0.5">
            {profile?.title ||
              "Technical Project Manager · Solutions Architect · AI Developer"}
          </p>
        </div>

        <div className="flex items-center gap-5">
          {profile?.linkedin_url && (
            <a
              href={profile.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-60 hover:opacity-100 transition-opacity"
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
              className="opacity-60 hover:opacity-100 transition-opacity"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
          )}
          <Link
            to="/contact"
            className="opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Contact"
          >
            <Mail className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="section-container pb-6 flex items-center justify-between gap-4">
        <p className="text-xs opacity-40">
          © {new Date().getFullYear()}{" "}
          {profile?.full_name || "Mauricio Marcon Teles"}. All rights reserved.
        </p>
        <Link
          to="/admin"
          className="text-xs opacity-30 hover:opacity-70 transition-opacity"
        >
          Admin
        </Link>
      </div>
    </footer>
  );
}
