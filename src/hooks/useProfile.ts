import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/integrations/aws/client";

export interface Profile {
  id: string;
  full_name: string;
  title: string;
  tagline: string;
  bio: string;
  photo_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  hero_stats?: Array<{ label: string; value: string }> | null;
}

export function useProfile() {
  return useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => {
      const data = await apiGet<Profile>("/profile");
      return {
        ...data,
        hero_stats: data.hero_stats ?? [],
      };
    },
  });
}
