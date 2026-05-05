import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, authGet, authPost, authPut, authDelete } from "@/integrations/aws/client";

export interface TagGroup {
  id: string;
  name: string;
  sort_order: number;
  tags: string[];
}

export function useTagGroups() {
  return useQuery<TagGroup[]>({
    queryKey: ["tag-groups"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const data = await apiGet<TagGroup[]>("/tag-groups");
      return (data || []).map((g) => ({ ...g, tags: g.tags || [] }));
    },
  });
}

export function useAdminTagGroups() {
  const qc = useQueryClient();

  const load = () =>
    authGet<TagGroup[]>("/admin/tag-groups").then((data) =>
      (data || []).map((g) => ({ ...g, tags: g.tags || [] }))
    );

  const create = async (name: string, sort_order: number) => {
    const group = await authPost<TagGroup>("/admin/tag-groups", { name, sort_order, tags: [] });
    qc.invalidateQueries({ queryKey: ["tag-groups"] });
    return group;
  };

  const update = async (id: string, patch: Partial<Pick<TagGroup, "name" | "sort_order" | "tags">>) => {
    const group = await authPut<TagGroup>(`/admin/tag-groups/${id}`, patch);
    qc.invalidateQueries({ queryKey: ["tag-groups"] });
    return group;
  };

  const remove = async (id: string) => {
    await authDelete(`/admin/tag-groups/${id}`);
    qc.invalidateQueries({ queryKey: ["tag-groups"] });
  };

  return { load, create, update, remove };
}
