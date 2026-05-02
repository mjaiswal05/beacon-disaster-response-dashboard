import { useState } from "react";
import { Download, File, FileText, Image as ImageIcon } from "lucide-react";

// Serialisation helpers
export const VAULT_FILE_PREFIX = "[VAULT_FILE]";

export interface AttachedVaultFile {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  download_url?: string;
}

export function encodeVaultAttachment(file: AttachedVaultFile): string {
  return `${VAULT_FILE_PREFIX}${JSON.stringify(file)}`;
}

export function decodeVaultAttachment(content: string): AttachedVaultFile | null {
  if (!content.startsWith(VAULT_FILE_PREFIX)) return null;
  try {
    return JSON.parse(content.slice(VAULT_FILE_PREFIX.length)) as AttachedVaultFile;
  } catch {
    return null;
  }
}

// ── Design tokens ──────────────────────────────────────────────
const BG      = "rgba(255,255,255,0.05)";
const BORDER  = "rgba(255,255,255,0.1)";
const TEXT    = "#e4e4e7";
const MUT     = "#8A8F98";

function fmtBytes(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function mimeColor(mime: string): string {
  if (mime.startsWith("image/")) return "#9333EA";
  if (mime === "application/pdf") return "#FF453A";
  if (mime.startsWith("video/")) return "#2563EB";
  if (mime.includes("sheet") || mime.includes("csv")) return "#32D74B";
  return "#8A8F98";
}

function MimeIcon({ mime, size }: { mime: string; size: number }) {
  const color = mimeColor(mime);
  const style = { color, strokeWidth: 1.5, width: size, height: size };
  if (mime.startsWith("image/")) return <ImageIcon style={style} />;
  if (mime.includes("pdf") || mime.includes("text") || mime.includes("doc"))
    return <FileText style={style} />;
  return <File style={style} />;
}

interface VaultAttachmentCardProps {
  file: AttachedVaultFile;
  /** When true, render inside a blue (sender) bubble — adjusts colours */
  isMine?: boolean;
}

export function VaultAttachmentCard({ file, isMine = false }: VaultAttachmentCardProps) {
  const [imgErr, setImgErr] = useState(false);
  const isImage = file.content_type.startsWith("image/");
  const color   = mimeColor(file.content_type);

  const bg     = isMine ? "rgba(255,255,255,0.12)" : BG;
  const border = isMine ? "rgba(255,255,255,0.18)" : BORDER;

  return (
    <div
      className="rounded-[10px] overflow-hidden"
      style={{ background: bg, border: `1px solid ${border}`, minWidth: 200, maxWidth: 240 }}
      aria-label={`Attached file: ${file.filename}`}
    >
      {/* Image preview */}
      {isImage && file.download_url && !imgErr && (
        <div
          className="w-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.25)", maxHeight: 160, overflow: "hidden" }}
        >
          <img
            src={file.download_url}
            alt={file.filename}
            className="w-full object-cover"
            style={{ maxHeight: 160 }}
            onError={() => setImgErr(true)}
            loading="lazy"
          />
        </div>
      )}

      {/* File info row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div
          className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
          style={{ background: `${color}20`, border: `1px solid ${color}30` }}
          aria-hidden="true"
        >
          <MimeIcon mime={file.content_type} size={14} />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="truncate"
            style={{ fontSize: "12px", fontWeight: 500, color: isMine ? "#fff" : TEXT }}
            title={file.filename}
          >
            {file.filename}
          </p>
          <p style={{ fontSize: "11px", color: isMine ? "rgba(255,255,255,0.6)" : MUT }}>
            {fmtBytes(file.size_bytes)}
          </p>
        </div>

        {file.download_url && (
          <a
            href={file.download_url}
            download={file.filename}
            onClick={(e) => e.stopPropagation()}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 transition-opacity hover:opacity-70"
            style={{ background: isMine ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)" }}
            aria-label={`Download ${file.filename}`}
          >
            <Download className="w-3.5 h-3.5" style={{ color: isMine ? "#fff" : TEXT }} />
          </a>
        )}
      </div>
    </div>
  );
}
