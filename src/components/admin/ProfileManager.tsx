import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

interface ProfileData {
  id?: string;
  full_name: string;
  title: string;
  tagline: string;
  bio: string;
  photo_url: string;
  linkedin_url: string;
  github_url: string;
  email: string;
  hero_stats: Array<{ label: string; value: string }>;
}

const emptyProfile: ProfileData = {
  full_name: "",
  title: "",
  tagline: "",
  bio: "",
  photo_url: "",
  linkedin_url: "",
  github_url: "",
  email: "",
  hero_stats: [],
};

export default function ProfileManager() {
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").limit(1).maybeSingle();
    if (data) {
      setProfile({
        ...data,
        photo_url: data.photo_url || "",
        linkedin_url: data.linkedin_url || "",
        github_url: data.github_url || "",
        email: data.email || "",
        hero_stats: (data.hero_stats as Array<{ label: string; value: string }>) || [],
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      full_name: profile.full_name,
      title: profile.title,
      tagline: profile.tagline,
      bio: profile.bio,
      photo_url: profile.photo_url || null,
      linkedin_url: profile.linkedin_url || null,
      github_url: profile.github_url || null,
      email: profile.email || null,
      hero_stats: profile.hero_stats,
    };

    let error;
    if (profile.id) {
      ({ error } = await supabase.from("profiles").update(payload).eq("id", profile.id));
    } else {
      ({ error } = await supabase.from("profiles").insert(payload));
    }

    if (error) {
      toast({ title: "Error saving profile", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved successfully" });
      loadProfile();
    }
    setSaving(false);
  };

  const updateStat = (index: number, field: "label" | "value", val: string) => {
    const stats = [...profile.hero_stats];
    stats[index] = { ...stats[index], [field]: val };
    setProfile((p) => ({ ...p, hero_stats: stats }));
  };

  const addStat = () => {
    setProfile((p) => ({
      ...p,
      hero_stats: [...p.hero_stats, { label: "", value: "" }],
    }));
  };

  const removeStat = (index: number) => {
    setProfile((p) => ({
      ...p,
      hero_stats: p.hero_stats.filter((_, i) => i !== index),
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Edit Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Full Name</Label>
            <Input
              value={profile.full_name}
              onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Title</Label>
            <Input
              value={profile.title}
              onChange={(e) => setProfile((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g., Technical Project Manager | AI Developer"
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label>Tagline</Label>
          <Input
            value={profile.tagline}
            onChange={(e) => setProfile((p) => ({ ...p, tagline: e.target.value }))}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label>Bio</Label>
          <Textarea
            value={profile.bio}
            onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
            rows={6}
            className="mt-1.5"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Photo URL</Label>
            <Input
              value={profile.photo_url}
              onChange={(e) => setProfile((p) => ({ ...p, photo_url: e.target.value }))}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>LinkedIn URL</Label>
            <Input
              value={profile.linkedin_url}
              onChange={(e) => setProfile((p) => ({ ...p, linkedin_url: e.target.value }))}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>GitHub URL</Label>
            <Input
              value={profile.github_url}
              onChange={(e) => setProfile((p) => ({ ...p, github_url: e.target.value }))}
              className="mt-1.5"
            />
          </div>
        </div>

        {/* Hero stats */}
        <div>
          <Label>Hero Stats</Label>
          <div className="space-y-3 mt-2">
            {profile.hero_stats.map((stat, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  placeholder="Value (e.g., 15+)"
                  value={stat.value}
                  onChange={(e) => updateStat(i, "value", e.target.value)}
                />
                <Input
                  placeholder="Label (e.g., Years Consulting)"
                  value={stat.label}
                  onChange={(e) => updateStat(i, "label", e.target.value)}
                />
                <Button variant="ghost" size="sm" onClick={() => removeStat(i)}>
                  ✕
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addStat}>
              + Add Stat
            </Button>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </CardContent>
    </Card>
  );
}
