import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timeline_entries")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as TimelineEntry[]) || [];
    },
  });
}
