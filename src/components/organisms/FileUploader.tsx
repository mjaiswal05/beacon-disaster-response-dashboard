import { useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle,
  File,
  FileSpreadsheet,
  FileText,
  Image,
  Loader,
  Upload,
  Video,
} from "lucide-react";
import { confirmUpload, initiateUpload } from "../../services/core.api";

interface UploadItem {
  localId: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "confirming" | "done" | "error";
  error?: string;
  fileId?: string;
}

interface FileUploaderProps {
  /** Used as folder_id in the initiate-upload payload. Pass incidentId by convention. */
  folderId: string;
  /** Called with every successfully uploaded+confirmed file. Parent handles linking/display. */
  onFileUploaded: (fileId: string, file: File) => void;
}

const MAX_MB = 100;
const MAX_BYTES = MAX_MB * 1024 * 1024;

function getIcon(mimeType: string): { Icon: typeof File; color: string } {
  if (mimeType.startsWith("image/")) return { Icon: Image, color: "#9333EA" };
  if (mimeType.startsWith("video/")) return { Icon: Video, color: "#2563EB" };
  if (mimeType.includes("pdf") || mimeType.includes("doc") || mimeType.includes("text"))
    return { Icon: FileText, color: "#FF453A" };
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv"))
    return { Icon: FileSpreadsheet, color: "#32D74B" };
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("archive"))
    return { Icon: Archive, color: "#FF9F0A" };
  return { Icon: File, color: "#8A8F98" };
}

function fmt(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploader({ folderId, onFileUploaded }: FileUploaderProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const patch = (localId: string, update: Partial<UploadItem>) =>
    setItems((prev) =>
      prev.map((i) => (i.localId === localId ? { ...i, ...update } : i)),
    );

  const uploadOne = async (item: UploadItem) => {
    patch(item.localId, { status: "uploading", progress: 0 });
    try {
      // Step 1 — get signed URL from backend
      const { file_id, signed_url } = await initiateUpload({
        folder_id: folderId,
        filename: item.file.name,
        content_type: item.file.type || "application/octet-stream",
        size_bytes: item.file.size,
      });

      // Step 2 — direct PUT to GCS (plain XHR for progress tracking; no app headers sent)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signed_url);
        xhr.setRequestHeader(
          "Content-Type",
          item.file.type || "application/octet-stream",
        );
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            patch(item.localId, {
              progress: Math.round((e.loaded / e.total) * 90),
            });
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`GCS returned ${xhr.status}`));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(item.file);
      });

      // Step 3 — confirm with backend
      patch(item.localId, { status: "confirming", progress: 95 });
      await confirmUpload(file_id);
      patch(item.localId, { status: "done", progress: 100, fileId: file_id });
      onFileUploaded(file_id, item.file);
    } catch (e: any) {
      patch(item.localId, {
        status: "error",
        error: e.message || "Upload failed",
      });
    }
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: UploadItem[] = Array.from(files)
      .filter((f) => f.size <= MAX_BYTES)
      .map((file) => ({
        localId: `${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
        status: "pending" as const,
      }));
    setItems((prev) => [...prev, ...next]);
    next.forEach(uploadOne);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files — click or drag and drop"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className="rounded-[14px] cursor-pointer text-center transition-colors"
        style={{
          padding: "24px",
          border: `2px dashed ${isDragging ? "#2563EB" : "var(--border)"}`,
          background: isDragging ? "rgba(37,99,235,0.06)" : "transparent",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <Upload
          className="w-7 h-7 mx-auto mb-2"
          style={{ color: isDragging ? "#2563EB" : "var(--muted-foreground)" }}
          strokeWidth={1.5}
        />
        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Drop files or click to browse
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
          Max {MAX_MB} MB per file
        </p>
      </div>

      {/* Per-file progress rows */}
      {items.length > 0 && (
        <div className="space-y-2" aria-label="Upload progress">
          {items.map((item) => {
            const { Icon, color } = getIcon(item.file.type);
            const busy =
              item.status === "uploading" || item.status === "confirming";
            return (
              <div
                key={item.localId}
                className="rounded-[12px] p-3"
                style={{
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{
                      background: `${color}15`,
                      border: `1px solid ${color}25`,
                    }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color }}
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--foreground)" }}
                    >
                      {item.file.name}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {fmt(item.file.size)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {item.status === "done" && (
                      <CheckCircle
                        className="w-4 h-4"
                        style={{ color: "#32D74B" }}
                        aria-label="Upload complete"
                      />
                    )}
                    {item.status === "error" && (
                      <AlertTriangle
                        className="w-4 h-4"
                        style={{ color: "#FF453A" }}
                        aria-label="Upload failed"
                      />
                    )}
                    {busy && (
                      <Loader
                        className="w-4 h-4 animate-spin"
                        style={{ color: "var(--muted-foreground)" }}
                        aria-label="Uploading"
                      />
                    )}
                  </div>
                </div>

                {busy && (
                  <div className="mt-2">
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: "var(--border)" }}
                      role="progressbar"
                      aria-valuenow={item.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${item.progress}%`,
                          background: "linear-gradient(90deg, #2563EB, #9333EA)",
                        }}
                      />
                    </div>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {item.status === "confirming"
                        ? "Confirming…"
                        : `${item.progress}%`}
                    </p>
                  </div>
                )}

                {item.status === "error" && (
                  <p className="text-xs mt-1" style={{ color: "#FF453A" }}>
                    {item.error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
