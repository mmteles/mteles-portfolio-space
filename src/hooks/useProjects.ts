import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Project {
  id: string;
  title: string;
  short_description: string;
  description: string;
  features: string[];
  tags: string[];
  demo_url: string | null;
  github_url: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  published: boolean;
  created_at: string;
}

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    staleTime: 5 * 60 * 1000, // treat data as fresh for 5 min — avoids re-fetch on navigation
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        features: (p.features as string[]) || [],
        tags: p.tags || [],
      }));
    },
  });
}

export function useProject(id: string) {
  return useQuery<Project | null>({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        features: (data.features as string[]) || [],
        tags: data.tags || [],
      };
    },
    enabled: !!id,
  });
}

export function useProjectMedia(projectId: string) {
  return useQuery({
    queryKey: ["project-media", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_media")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}
