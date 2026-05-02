import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  Download,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  Image,
  Loader,
  Paperclip,
  Trash2,
  UploadCloud,
  Video,
} from "lucide-react";
import {
  deleteVaultFile,
  getIncidentVaultFolder,
  linkIncidentAttachment,
  listIncidentAttachments,
} from "../../services/core.api";
import type { Attachment, VaultFile } from "../../types/core.types";
import { FileUploader } from "./FileUploader";
import { FilePreviewModal } from "./FilePreviewModal";

interface Props {
  incidentId: string;
  /** Used to name the vault folder on first creation: "{title} – {id}" */
  incidentTitle?: string;
}

function getIcon(mimeType: string): { Icon: typeof File; color: string } {
  if (mimeType.startsWith("image/")) return { Icon: Image, color: "#9333EA" };
  if (mimeType.startsWith("video/")) return { Icon: Video, color: "#2563EB" };
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("doc") ||
    mimeType.includes("text")
  )
    return { Icon: FileText, color: "#FF453A" };
  if (
    mimeType.includes("sheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("csv")
  )
    return { Icon: FileSpreadsheet, color: "#32D74B" };
  if (
    mimeType.includes("zip") ||
    mimeType.includes("tar") ||
    mimeType.includes("archive")
  )
    return { Icon: Archive, color: "#FF9F0A" };
  return { Icon: File, color: "#8A8F98" };
}

function fmt(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function IncidentAttachments({ incidentId, incidentTitle }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // The vault folder ID to upload into for this incident.
  // Fetched lazily the first time the uploader is opened.
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null);
  const [isFetchingFolder, setIsFetchingFolder] = useState(false);

  // Full-page preview
  const [previewFile, setPreviewFile] = useState<VaultFile | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setAttachments(await listIncidentAttachments(incidentId));
    } catch (e: any) {
      setError(e.message || "Failed to load attachments");
    } finally {
      setIsLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    load();
  }, [load]);

  // Fetch or create the upload folder when the uploader is first opened.
  const handleToggleUploader = async () => {
    if (!showUploader && !uploadFolderId) {
      setIsFetchingFolder(true);
      try {
        // Build a readable folder name: "Title – abc12345" (max 100 chars total)
        const shortId = incidentId.slice(0, 8);
        const base    = incidentTitle
          ? `${incidentTitle.trim().slice(0, 80)} – ${shortId}`
          : shortId;
        const folderName = base.slice(0, 100);
        const folder = await getIncidentVaultFolder(incidentId, folderName);
        setUploadFolderId(folder.id);
      } catch {
        // Folder fetch failed — uploader will stay hidden.
        setIsFetchingFolder(false);
        return;
      } finally {
        setIsFetchingFolder(false);
      }
    }
    setShowUploader((v) => !v);
  };

  // Called by FileUploader for each successfully confirmed file.
  const handleFileUploaded = async (fileId: string, _file: File) => {
    try {
      await linkIncidentAttachment(incidentId, fileId);
      load();
    } catch {
      load();
    }
  };

  const handleDelete = async (att: Attachment) => {
    setDeletingId(att.id);
    try {
      await deleteVaultFile(att.file_id);
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    } catch {
      load();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Paperclip
            className="w-4 h-4"
            style={{ color: "#8A8F98" }}
            aria-hidden="true"
          />
          Attachments
          {attachments.length > 0 && (
            <span
              className="text-xs px-2 py-1 rounded ml-1"
              style={{
                background: "var(--secondary)",
                color: "var(--muted-foreground)",
              }}
            >
              {attachments.length}
            </span>
          )}
        </h2>
        <button
          onClick={handleToggleUploader}
          disabled={isFetchingFolder}
          className="flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-xs font-medium transition-colors disabled:opacity-50"
          style={{
            background: showUploader
              ? "rgba(37,99,235,0.15)"
              : "var(--secondary)",
            border: "1px solid var(--border)",
            color: showUploader ? "#2563EB" : "var(--muted-foreground)",
          }}
          aria-label={showUploader ? "Hide uploader" : "Upload attachments"}
          aria-expanded={showUploader}
        >
          {isFetchingFolder ? (
            <Loader className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          Upload
        </button>
      </div>

      {/* Uploader (toggled) */}
      {showUploader && uploadFolderId && (
        <div className="mb-4">
          <FileUploader
            folderId={uploadFolderId}
            onFileUploaded={handleFileUploaded}
          />
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div
          className="flex items-center gap-2 text-sm py-4"
          style={{ color: "var(--muted-foreground)" }}
          aria-busy="true"
          aria-label="Loading attachments"
        >
          <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />
          Loading attachments…
        </div>
      ) : error ? (
        <p
          role="alert"
          className="text-sm py-4"
          style={{ color: "#FF453A" }}
        >
          {error}
        </p>
      ) : attachments.length === 0 ? (
        <p className="text-sm py-4" style={{ color: "var(--muted-foreground)" }}>
          No attachments yet.
        </p>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => {
            const { file } = att;
            const { Icon, color } = getIcon(file.content_type);
            const isImage = file.content_type.startsWith("image/");
            const canPreview =
              (isImage ||
                file.content_type.startsWith("video/") ||
                file.content_type === "application/pdf") &&
              !!file.download_url;

            return (
              <div
                key={att.id}
                className="rounded-[12px] p-3 flex items-center gap-3 group"
                style={{
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                {/* Thumbnail or icon */}
                {isImage && file.download_url ? (
                  <img
                    src={file.download_url}
                    alt={file.filename}
                    className="w-9 h-9 rounded-[8px] object-cover shrink-0"
                  />
                ) : (
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
                )}

                {/* Name + size */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--foreground)" }}
                    title={file.filename}
                  >
                    {file.filename}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {fmt(file.size_bytes)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {canPreview && (
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors hover:bg-[var(--background)]"
                      aria-label={`Preview ${file.filename}`}
                    >
                      <Eye
                        className="w-3.5 h-3.5"
                        style={{ color: "var(--muted-foreground)" }}
                        strokeWidth={1.5}
                      />
                    </button>
                  )}
                  {file.download_url && (
                    <a
                      href={file.download_url}
                      download={file.filename}
                      className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors hover:bg-[var(--background)]"
                      aria-label={`Download ${file.filename}`}
                    >
                      <Download
                        className="w-3.5 h-3.5"
                        style={{ color: "var(--muted-foreground)" }}
                        strokeWidth={1.5}
                      />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(att)}
                    disabled={deletingId === att.id}
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors hover:bg-[var(--background)] disabled:opacity-50"
                    aria-label={`Delete ${file.filename}`}
                  >
                    {deletingId === att.id ? (
                      <Loader
                        className="w-3.5 h-3.5 animate-spin"
                        style={{ color: "var(--muted-foreground)" }}
                      />
                    ) : (
                      <Trash2
                        className="w-3.5 h-3.5"
                        style={{ color: "#FF453A" }}
                        strokeWidth={1.5}
                      />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full-page file preview */}
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
