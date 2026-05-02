import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/integrations/aws/client";

export interface TimelineEntry {
  id: string;
  title: string;
  organization: string;
  start_date: string;
  end_date: string | null;
  description: string;
  entry_type: "work" | "education";
  sort_order: number;
}

export function useTimeline() {
  return useQuery<TimelineEntry[]>({
    queryKey: ["timeline"],
    queryFn: () => apiGet<TimelineEntry[]>("/timeline"),
  });
}
