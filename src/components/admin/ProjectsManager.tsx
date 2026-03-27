import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Save } from "lucide-react";

interface ProjectForm {
  id?: string;
  title: string;
  short_description: string;
  description: string;
  features: string;
  tags: string;
  demo_url: string;
  github_url: string;
  thumbnail_url: string;
  sort_order: number;
  published: boolean;
}

const emptyProject: ProjectForm = {
  title: "",
  short_description: "",
  description: "",
  features: "",
  tags: "",
  demo_url: "",
  github_url: "",
  thumbnail_url: "",
  sort_order: 0,
  published: true,
};

export default function ProjectsManager() {
  const [projects, setProjects] = useState<any[]>([]);
  const [form, setForm] = useState<ProjectForm>(emptyProject);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("sort_order", { ascending: true });
    setProjects(data || []);
  };

  const openNew = () => {
    setForm(emptyProject);
    setEditing(false);
    setOpen(true);
  };

  const openEdit = (project: any) => {
    setForm({
      id: project.id,
      title: project.title,
      short_description: project.short_description,
      description: project.description,
      features: ((project.features as string[]) || []).join("\n"),
      tags: (project.tags || []).join(", "),
      demo_url: project.demo_url || "",
      github_url: project.github_url || "",
      thumbnail_url: project.thumbnail_url || "",
      sort_order: project.sort_order,
      published: project.published,
    });
    setEditing(true);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      short_description: form.short_description.trim(),
      description: form.description.trim(),
      features: form.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      demo_url: form.demo_url || null,
      github_url: form.github_url || null,
      thumbnail_url: form.thumbnail_url || null,
      sort_order: form.sort_order,
      published: form.published,
    };

    let error;
    if (editing && form.id) {
      ({ error } = await supabase.from("projects").update(payload).eq("id", form.id));
    } else {
      ({ error } = await supabase.from("projects").insert(payload));
    }

    if (error) {
      toast({ title: "Error saving project", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Project ${editing ? "updated" : "created"}` });
      setOpen(false);
      loadProjects();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting project", variant: "destructive" });
    } else {
      loadProjects();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif">Projects</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={openNew}>
              <Plus className="h-4 w-4" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif">
                {editing ? "Edit Project" : "New Project"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Short Description</Label>
                <Input
                  value={form.short_description}
                  onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Full Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={5}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Features (one per line)</Label>
                <Textarea
                  value={form.features}
                  onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
                  rows={4}
                  placeholder={"Feature 1\nFeature 2\nFeature 3"}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="Machine Learning, Python, Computer Vision"
                  className="mt-1.5"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Demo URL</Label>
                  <Input
                    value={form.demo_url}
                    onChange={(e) => setForm((f) => ({ ...f, demo_url: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>GitHub URL</Label>
                  <Input
                    value={form.github_url}
                    onChange={(e) => setForm((f) => ({ ...f, github_url: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Thumbnail URL</Label>
                  <Input
                    value={form.thumbnail_url}
                    onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))
                    }
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                  id="published"
                />
                <Label htmlFor="published">Published</Label>
              </div>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Project"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No projects yet.</p>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div>
                  <p className="font-medium">{project.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {(project.tags || []).join(", ")}
                    {!project.published && " • Draft"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(project)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(project.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
