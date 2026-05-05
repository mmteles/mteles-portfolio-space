import { useState, useEffect, useMemo } from "react";
import { useAdminTagGroups, TagGroup } from "@/hooks/useTagGroups";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Check, X, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Small inline-edit input ──────────────────────────────────────────────────
function InlineEdit({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(draft.trim());
          if (e.key === "Escape") onCancel();
        }}
        className="h-7 text-sm w-44"
      />
      <button onClick={() => onSave(draft.trim())} className="text-green-600 hover:text-green-700">
        <Check className="h-4 w-4" />
      </button>
      <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TagsManager() {
  const { load, create, update, remove } = useAdminTagGroups();
  const { data: projects = [] } = useProjects();
  const { toast } = useToast();

  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    load()
      .then(setGroups)
      .catch(() => toast({ title: "Failed to load tag groups", variant: "destructive" }))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // All tags actually used by projects
  const allProjectTags = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [projects]);

  // Tags not assigned to any group
  const uncategorized = useMemo(() => {
    const assigned = new Set(groups.flatMap((g) => g.tags.map((t) => t.toLowerCase())));
    return allProjectTags.filter((t) => !assigned.has(t.toLowerCase()));
  }, [groups, allProjectTags]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const refreshGroups = () =>
    load()
      .then(setGroups)
      .catch(() => toast({ title: "Failed to refresh", variant: "destructive" }));

  const handleRenameGroup = async (id: string, name: string) => {
    if (!name) return;
    try {
      await update(id, { name });
      setEditingGroupId(null);
      await refreshGroups();
    } catch {
      toast({ title: "Failed to rename group", variant: "destructive" });
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`Delete group "${name}"? Tags in it will move to Other.`)) return;
    try {
      await remove(id);
      await refreshGroups();
    } catch {
      toast({ title: "Failed to delete group", variant: "destructive" });
    }
  };

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      setCreatingGroup(true);
      const maxOrder = groups.reduce((m, g) => Math.max(m, g.sort_order), -1);
      await create(name, maxOrder + 1);
      setNewGroupName("");
      await refreshGroups();
    } catch {
      toast({ title: "Failed to create group", variant: "destructive" });
    } finally {
      setCreatingGroup(false);
    }
  };

  // Move tag from its current group (or uncategorized) into targetGroupId
  const handleMoveTag = async (tag: string, targetGroupId: string) => {
    try {
      // Remove from any group that currently contains it
      const updates = groups
        .filter((g) => g.tags.some((t) => t.toLowerCase() === tag.toLowerCase()))
        .map((g) => update(g.id, { tags: g.tags.filter((t) => t.toLowerCase() !== tag.toLowerCase()) }));
      await Promise.all(updates);

      // Add to target group (unless "Other" sentinel — that just removes from all groups)
      if (targetGroupId !== "__other__") {
        const target = groups.find((g) => g.id === targetGroupId);
        if (target) await update(targetGroupId, { tags: [...target.tags, tag] });
      }

      await refreshGroups();
    } catch {
      toast({ title: "Failed to move tag", variant: "destructive" });
    }
  };

  const handleAddTagToGroup = async (groupId: string) => {
    const tag = (newTagInputs[groupId] ?? "").trim();
    if (!tag) return;
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    if (group.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      toast({ title: "Tag already in this group", variant: "destructive" });
      return;
    }
    try {
      await update(groupId, { tags: [...group.tags, tag] });
      setNewTagInputs((prev) => ({ ...prev, [groupId]: "" }));
      await refreshGroups();
    } catch {
      toast({ title: "Failed to add tag", variant: "destructive" });
    }
  };

  const handleRemoveTagFromGroup = async (groupId: string, tag: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    try {
      await update(groupId, { tags: group.tags.filter((t) => t !== tag) });
      await refreshGroups();
    } catch {
      toast({ title: "Failed to remove tag", variant: "destructive" });
    }
  };

  const handleReorder = async (index: number, direction: "up" | "down") => {
    const sorted = [...groups].sort((a, b) => a.sort_order - b.sort_order);
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= sorted.length) return;
    try {
      await Promise.all([
        update(sorted[index].id, { sort_order: sorted[swap].sort_order }),
        update(sorted[swap].id, { sort_order: sorted[index].sort_order }),
      ]);
      await refreshGroups();
    } catch {
      toast({ title: "Failed to reorder", variant: "destructive" });
    }
  };

  const sortedGroups = [...groups].sort((a, b) => a.sort_order - b.sort_order);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Create new group ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Create Group</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Group name…"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
              className="h-9 text-sm max-w-xs"
            />
            <Button
              size="sm"
              onClick={handleCreateGroup}
              disabled={creatingGroup || !newGroupName.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Groups ───────────────────────────────────────────────────────── */}
      {sortedGroups.map((group, idx) => (
        <Card key={group.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              {/* Group name / inline edit */}
              {editingGroupId === group.id ? (
                <InlineEdit
                  value={group.name}
                  onSave={(v) => handleRenameGroup(group.id, v)}
                  onCancel={() => setEditingGroupId(null)}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold">{group.name}</CardTitle>
                  <button
                    onClick={() => setEditingGroupId(group.id)}
                    className="text-muted-foreground hover:text-foreground"
                    title="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Reorder + delete */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleReorder(idx, "up")}
                  disabled={idx === 0}
                  className={cn("p-1 rounded hover:bg-muted transition-colors", idx === 0 && "opacity-30 pointer-events-none")}
                  title="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleReorder(idx, "down")}
                  disabled={idx === sortedGroups.length - 1}
                  className={cn("p-1 rounded hover:bg-muted transition-colors", idx === sortedGroups.length - 1 && "opacity-30 pointer-events-none")}
                  title="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteGroup(group.id, group.name)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                  title="Delete group"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Existing tags */}
            <div className="flex flex-wrap gap-1.5 min-h-6">
              {group.tags.length === 0 && (
                <span className="text-xs text-muted-foreground italic">No tags yet</span>
              )}
              {group.tags.map((tag) => (
                <div key={tag} className="flex items-center gap-0.5 group/tag">
                  <Badge variant="secondary" className="text-xs pr-1 gap-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTagFromGroup(group.id, tag)}
                      className="opacity-40 group-hover/tag:opacity-100 hover:text-destructive transition-opacity"
                      title="Remove from group"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                  {/* Move to another group */}
                  <Select onValueChange={(val) => handleMoveTag(tag, val)}>
                    <SelectTrigger className="h-5 w-5 border-0 p-0 opacity-0 group-hover/tag:opacity-60 hover:!opacity-100 [&>svg]:hidden bg-transparent shadow-none">
                      <span className="text-[10px] leading-none">↗</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__other__">Move to Other</SelectItem>
                      {sortedGroups
                        .filter((g) => g.id !== group.id)
                        .map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            Move to {g.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Add tag to this group */}
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Add tag…"
                value={newTagInputs[group.id] ?? ""}
                onChange={(e) =>
                  setNewTagInputs((prev) => ({ ...prev, [group.id]: e.target.value }))
                }
                onKeyDown={(e) => e.key === "Enter" && handleAddTagToGroup(group.id)}
                className="h-7 text-xs max-w-[200px]"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleAddTagToGroup(group.id)}
                disabled={!(newTagInputs[group.id] ?? "").trim()}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* ── Uncategorized tags (from projects, not in any group) ──────────── */}
      {uncategorized.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Other (uncategorized)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              These tags are used by projects but not assigned to any group. Use the "Move to" arrow to assign them.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {uncategorized.map((tag) => (
                <div key={tag} className="flex items-center gap-0.5 group/tag">
                  <Badge variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                  <Select onValueChange={(val) => handleMoveTag(tag, val)}>
                    <SelectTrigger className="h-5 w-5 border-0 p-0 opacity-40 hover:opacity-100 [&>svg]:hidden bg-transparent shadow-none">
                      <span className="text-[10px] leading-none">↗</span>
                    </SelectTrigger>
                    <SelectContent>
                      {sortedGroups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          Move to {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {groups.length === 0 && uncategorized.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No tag groups yet. Create one above to get started.
        </p>
      )}
    </div>
  );
}
