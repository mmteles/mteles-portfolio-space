import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/integrations/aws/client";

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
  published?: boolean;
  created_at: string;
}

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const data = await apiGet<Project[]>("/projects");
      return (data || []).map((p) => ({
        ...p,
        features: (p.features as string[]) || [],
        tags: (p.tags as string[]) || [],
      }));
    },
  });
}

export function useProject(id: string) {
  return useQuery<Project | null>({
    queryKey: ["project", id],
    queryFn: async () => {
      try {
        const data = await apiGet<Project>(`/projects/${id}`);
        return {
          ...data,
          features: (data.features as string[]) || [],
          tags: (data.tags as string[]) || [],
        };
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("404")) return null;
        throw err;
      }
    },
    enabled: !!id,
  });
}

export function useProjectMedia(projectId: string) {
  return useQuery({
    queryKey: ["project-media", projectId],
    queryFn: () => apiGet(`/projects/${projectId}/media`),
    enabled: !!projectId,
  });
}
