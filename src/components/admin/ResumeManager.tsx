import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Trash2 } from "lucide-react";

export default function ResumeManager() {
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    const { data } = await supabase.storage.from("resume").list();
    setFiles(data || []);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({ title: "Only PDF files are allowed", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File must be smaller than 10MB", variant: "destructive" });
      return;
    }

    setUploading(true);

    // Delete existing resume files first
    for (const f of files) {
      await supabase.storage.from("resume").remove([f.name]);
    }

    const { error } = await supabase.storage
      .from("resume")
      .upload(`resume-${Date.now()}.pdf`, file, { upsert: true });

    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Resume uploaded successfully" });
      loadFiles();
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (name: string) => {
    if (!confirm("Delete this resume file?")) return;
    await supabase.storage.from("resume").remove([name]);
    loadFiles();
    toast({ title: "Resume deleted" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Resume</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            onChange={handleUpload}
            className="hidden"
            id="resume-upload"
          />
          <Button
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload PDF Resume"}
          </Button>
        </div>

        {files.length > 0 ? (
          <div className="space-y-2">
            {files.map((file) => {
              const { data } = supabase.storage.from("resume").getPublicUrl(file.name);
              return (
                <div
                  key={file.name}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <a
                    href={data.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    {file.name}
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(file.name)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No resume uploaded yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
