import { useState, useEffect, useRef } from "react";
import { authPost } from "@/integrations/aws/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Trash2 } from "lucide-react";

interface UploadUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

interface ResumeFile {
  key: string;
  publicUrl: string;
  name: string;
}

const STORAGE_BASE_URL = ((import.meta.env.VITE_STORAGE_BASE_URL as string) ?? "").replace(/\/$/, "");

export default function ResumeManager() {
  const [files, setFiles] = useState<ResumeFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadFiles();
  }, []);

  // List resume files by fetching known resume URL from storage base URL.
  // Since there's no list API, we store the current resume info in localStorage
  // so the admin panel can display it after upload.
  const loadFiles = () => {
    try {
      const stored = localStorage.getItem("portfolio_resume_files");
      if (stored) setFiles(JSON.parse(stored));
    } catch { /* ignore */ }
  };

  const persistFiles = (updated: ResumeFile[]) => {
    localStorage.setItem("portfolio_resume_files", JSON.stringify(updated));
    setFiles(updated);
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
    try {
      // Step 1: get a presigned S3 PUT URL from the API
      const { uploadUrl, publicUrl, key } = await authPost<UploadUrlResponse>("/admin/upload-url", {
        bucket: "resume",
        filename: file.name,
        contentType: file.type,
      });

      // Step 2: PUT the file directly to S3 (no Lambda involved)
      const s3Res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!s3Res.ok) throw new Error("S3 upload failed");

      // Track the uploaded file locally
      const newFile: ResumeFile = { key, publicUrl, name: file.name };
      persistFiles([newFile]); // replace — only one resume at a time
      toast({ title: "Resume uploaded successfully" });
    } catch (err: unknown) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = (key: string) => {
    if (!confirm("Delete this resume file?")) return;
    // Remove from local tracking — the S3 object stays until overwritten by the next upload.
    // To hard-delete from S3, add a DELETE /admin/resume/:key endpoint.
    persistFiles(files.filter((f) => f.key !== key));
    toast({ title: "Resume removed from listing" });
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
            {files.map((file) => (
              <div
                key={file.key}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <a
                  href={file.publicUrl || `${STORAGE_BASE_URL}/resume/${file.key}`}
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
                  onClick={() => handleDelete(file.key)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No resume uploaded yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
