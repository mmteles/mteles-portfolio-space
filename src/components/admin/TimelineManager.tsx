import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Save, Briefcase, GraduationCap } from "lucide-react";

interface TimelineForm {
  id?: string;
  title: string;
  organization: string;
  start_date: string;
  end_date: string;
  description: string;
  entry_type: string;
  sort_order: number;
}

const emptyEntry: TimelineForm = {
  title: "",
  organization: "",
  start_date: "",
  end_date: "",
  description: "",
  entry_type: "work",
  sort_order: 0,
};

export default function TimelineManager() {
  const [entries, setEntries] = useState<any[]>([]);
  const [form, setForm] = useState<TimelineForm>(emptyEntry);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const { data } = await supabase
      .from("timeline_entries")
      .select("*")
      .order("sort_order", { ascending: true });
    setEntries(data || []);
  };

  const openNew = () => {
    setForm(emptyEntry);
    setEditing(false);
    setOpen(true);
  };

  const openEdit = (entry: any) => {
    setForm({
      id: entry.id,
      title: entry.title,
      organization: entry.organization,
      start_date: entry.start_date,
      end_date: entry.end_date || "",
      description: entry.description,
      entry_type: entry.entry_type,
      sort_order: entry.sort_order,
    });
    setEditing(true);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.organization.trim()) {
      toast({ title: "Title and organization are required", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      organization: form.organization.trim(),
      start_date: form.start_date,
      end_date: form.end_date || null,
      description: form.description.trim(),
      entry_type: form.entry_type,
      sort_order: form.sort_order,
    };

    let error;
    if (editing && form.id) {
      ({ error } = await supabase.from("timeline_entries").update(payload).eq("id", form.id));
    } else {
      ({ error } = await supabase.from("timeline_entries").insert(payload));
    }

    if (error) {
      toast({ title: "Error saving entry", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Entry ${editing ? "updated" : "created"}` });
      setOpen(false);
      loadEntries();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase.from("timeline_entries").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting entry", variant: "destructive" });
    } else {
      loadEntries();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif">Timeline</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={openNew}>
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif">
                {editing ? "Edit Entry" : "New Entry"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.entry_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, entry_type: v }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work">Work Experience</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title / Role</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Organization</Label>
                <Input
                  value={form.organization}
                  onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    placeholder="e.g., Jan 2020"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    placeholder="e.g., Present"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
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
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Entry"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No timeline entries yet.</p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  {entry.entry_type === "education" ? (
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{entry.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.organization} • {entry.start_date} — {entry.end_date || "Present"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(entry)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(entry.id)}
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
