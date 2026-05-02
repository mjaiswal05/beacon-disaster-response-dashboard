import { useEffect, useState } from "react";
import {
  X,
  Download,
  File,
  FileText,
  FileSpreadsheet,
  Image,
  Video,
  Archive,
  Music,
  Code,
  Loader,
  Database,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PreviewFile {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  download_url?: string;
  // Optional extended metadata (populated when a VaultFile is passed)
  created_at?: string;
  updated_at?: string;
  uploaded_by?: string;
  last_accessed_at?: string;
  checksum?: string;
}

interface Props {
  file: PreviewFile | null;
  onClose: () => void;
}

function fmtBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

type FileCategory =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "code"
  | "csv"
  | "spreadsheet"
  | "archive"
  | "other";

function getCategory(mime: string, filename: string): FileCategory {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  if (mime === "text/csv" || filename.toLowerCase().endsWith(".csv")) return "csv";
  if (
    mime === "application/json" ||
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("x-python") ||
    mime.includes("x-sh") ||
    mime.startsWith("text/")
  )
    return "code";
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("spreadsheet"))
    return "spreadsheet";
  if (
    mime.includes("zip") ||
    mime.includes("tar") ||
    mime.includes("archive") ||
    mime.includes("gzip") ||
    mime.includes("rar")
  )
    return "archive";
  return "other";
}

const categoryMeta: Record<
  FileCategory,
  { icon: typeof File; color: string; label: string }
> = {
  image:       { icon: Image,          color: "#9333EA", label: "Image"       },
  video:       { icon: Video,          color: "#2563EB", label: "Video"       },
  audio:       { icon: Music,          color: "#FF375F", label: "Audio"       },
  pdf:         { icon: FileText,       color: "#FF453A", label: "PDF"         },
  code:        { icon: Code,           color: "#00C7BE", label: "Code"        },
  csv:         { icon: Database,       color: "#32D74B", label: "CSV"         },
  spreadsheet: { icon: FileSpreadsheet,color: "#32D74B", label: "Spreadsheet" },
  archive:     { icon: Archive,        color: "#FF9F0A", label: "Archive"     },
  other:       { icon: File,           color: "#8A8F98", label: "File"        },
};

function parseCSV(text: string): string[][] {
  return text
    .trim()
    .split("\n")
    .slice(0, 100)
    .map((row) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const char of row) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
}

// ── No-preview fallback ─────────────────────────────────────

interface NoPreviewProps {
  file: PreviewFile;
  FileIcon: typeof File;
  iconColor: string;
}

function NoPreview({ file, FileIcon, iconColor }: NoPreviewProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div
        className="w-20 h-20 rounded-[20px] flex items-center justify-center"
        style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}20` }}
      >
        <FileIcon
          className="w-10 h-10"
          style={{ color: iconColor }}
          strokeWidth={1}
          aria-hidden="true"
        />
      </div>
      <div>
        <p style={{ fontSize: "15px", color: "#CCCCCC", fontWeight: 500, marginBottom: "4px" }}>
          No preview available
        </p>
        <p style={{ fontSize: "13px", color: "#8A8F98" }}>{file.content_type}</p>
      </div>
      {file.download_url && (
        <a
          href={file.download_url}
          download={file.filename}
          className="flex items-center gap-2 h-10 px-5 rounded-[12px] text-white transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #2563EB, #9333EA)",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Download file
        </a>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────

export function FilePreviewModal({ file, onClose }: Props) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [showMeta, setShowMeta] = useState(false);

  // Close on Escape key.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Reset meta panel when a new file is opened.
  useEffect(() => { setShowMeta(false); }, [file?.id]);

  const category = file ? getCategory(file.content_type, file.filename) : "other";
  const meta = categoryMeta[category];
  const FileIcon = meta.icon;
  const iconColor = meta.color;

  // Fetch text content for code/CSV files.
  const isTextBased = category === "code" || category === "csv";
  useEffect(() => {
    if (!file?.download_url || !isTextBased) {
      setTextContent(null);
      return;
    }
    let cancelled = false;
    setIsLoadingText(true);
    setTextContent(null);
    fetch(file.download_url)
      .then((r) => r.text())
      .then((t) => { if (!cancelled) setTextContent(t); })
      .catch(() => { if (!cancelled) setTextContent(null); })
      .finally(() => { if (!cancelled) setIsLoadingText(false); });
    return () => { cancelled = true; };
  }, [file?.download_url, isTextBased]);

  const csvRows = category === "csv" && textContent ? parseCSV(textContent) : null;

  return (
    <AnimatePresence>
      {file && (
        <>
          {/* Backdrop */}
          <motion.div
            key="preview-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60]"
            style={{ background: "rgba(0,0,0,0.92)" }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            key="preview-modal"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="fixed inset-4 z-[61] flex flex-col rounded-[20px] overflow-hidden"
            style={{ background: "#0A0A0A", border: "1px solid #1C1C1C" }}
            role="dialog"
            aria-modal="true"
            aria-label={`Preview: ${file.filename}`}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: "1px solid #1C1C1C" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}20` }}
                >
                  <FileIcon
                    className="w-4 h-4"
                    style={{ color: iconColor }}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-white font-semibold truncate"
                    style={{ fontSize: "15px" }}
                    title={file.filename}
                  >
                    {file.filename}
                  </p>
                  <p style={{ fontSize: "12px", color: "#8A8F98" }}>
                    {meta.label} · {fmtBytes(file.size_bytes)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {file.download_url && (
                  <a
                    href={file.download_url}
                    download={file.filename}
                    className="flex items-center gap-2 h-9 px-3 rounded-[10px] transition-colors hover:bg-[#1C1C1C]"
                    style={{
                      border: "1px solid #1C1C1C",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#CCCCCC",
                    }}
                    aria-label={`Download ${file.filename}`}
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    Download
                  </a>
                )}
                <button
                  onClick={() => setShowMeta((v) => !v)}
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors"
                  style={{
                    border: "1px solid #1C1C1C",
                    background: showMeta ? "rgba(37,99,235,0.15)" : "transparent",
                    borderColor: showMeta ? "rgba(37,99,235,0.3)" : "#1C1C1C",
                  }}
                  aria-label="Toggle file info"
                  aria-pressed={showMeta}
                >
                  <Info className="w-4 h-4" style={{ color: showMeta ? "#2563EB" : "#8A8F98" }} />
                </button>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors hover:bg-[#1C1C1C]"
                  style={{ border: "1px solid #1C1C1C" }}
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4" style={{ color: "#8A8F98" }} />
                </button>
              </div>
            </div>

            {/* Preview content */}
            <div className="flex-1 min-h-0 overflow-hidden">

              {/* ── IMAGE ── */}
              {category === "image" && (
                file.download_url ? (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <img
                      src={file.download_url}
                      alt={file.filename}
                      className="max-w-full max-h-full object-contain rounded-[12px]"
                      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-8">
                    <NoPreview file={file} FileIcon={FileIcon} iconColor={iconColor} />
                  </div>
                )
              )}

              {/* ── VIDEO ── */}
              {category === "video" && (
                file.download_url ? (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      src={file.download_url}
                      controls
                      className="max-w-full max-h-full rounded-[12px]"
                      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-8">
                    <NoPreview file={file} FileIcon={FileIcon} iconColor={iconColor} />
                  </div>
                )
              )}

              {/* ── AUDIO ── */}
              {category === "audio" && (
                <div className="w-full h-full flex items-center justify-center p-8">
                  <div className="flex flex-col items-center gap-8 w-full max-w-md">
                    <div
                      className="w-28 h-28 rounded-[28px] flex items-center justify-center"
                      style={{
                        background: `${iconColor}15`,
                        border: `1px solid ${iconColor}20`,
                        boxShadow: `0 0 60px ${iconColor}18`,
                      }}
                    >
                      <Music className="w-14 h-14" style={{ color: iconColor }} strokeWidth={1.5} />
                    </div>
                    <div className="text-center">
                      <p className="text-white mb-1" style={{ fontSize: "16px", fontWeight: 600 }}>
                        {file.filename}
                      </p>
                      <p style={{ fontSize: "13px", color: "#8A8F98" }}>{fmtBytes(file.size_bytes)}</p>
                    </div>
                    {file.download_url ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <audio
                        src={file.download_url}
                        controls
                        className="w-full"
                        style={{ colorScheme: "dark" }}
                      />
                    ) : (
                      <p style={{ fontSize: "13px", color: "#8A8F98" }}>No audio URL available</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── PDF ── */}
              {category === "pdf" && (
                file.download_url ? (
                  <iframe
                    src={file.download_url}
                    title={file.filename}
                    className="w-full h-full"
                    style={{ border: "none", background: "#fff" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-8">
                    <NoPreview file={file} FileIcon={FileIcon} iconColor={iconColor} />
                  </div>
                )
              )}

              {/* ── CODE / TEXT ── */}
              {category === "code" && (
                isLoadingText ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader className="w-6 h-6 animate-spin" style={{ color: "#8A8F98" }} />
                  </div>
                ) : textContent !== null ? (
                  <div className="w-full h-full overflow-auto p-5">
                    <pre
                      style={{
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                        color: "#E2E8F0",
                        fontSize: "13px",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {textContent}
                    </pre>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-8">
                    <NoPreview file={file} FileIcon={FileIcon} iconColor={iconColor} />
                  </div>
                )
              )}

              {/* ── CSV ── */}
              {category === "csv" && (
                isLoadingText ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader className="w-6 h-6 animate-spin" style={{ color: "#8A8F98" }} />
                  </div>
                ) : csvRows && csvRows.length > 0 ? (
                  <div className="w-full h-full overflow-auto">
                    <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
                      <thead
                        className="sticky top-0"
                        style={{ background: "#0D0D0D", borderBottom: "1px solid #1C1C1C" }}
                      >
                        <tr>
                          {csvRows[0].map((cell, i) => (
                            <th
                              key={i}
                              className="px-4 py-3"
                              style={{
                                fontSize: "11px",
                                color: "#8A8F98",
                                fontWeight: 600,
                                letterSpacing: "0.5px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {cell.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvRows.slice(1).map((row, ri) => (
                          <tr
                            key={ri}
                            className="hover:bg-[#141414] transition-colors"
                            style={{ borderBottom: "1px solid #141414" }}
                          >
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                className="px-4 py-2.5"
                                style={{ fontSize: "13px", color: "#CCCCCC", whiteSpace: "nowrap" }}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvRows.length >= 100 && (
                      <p
                        className="text-center py-3"
                        style={{ fontSize: "12px", color: "#8A8F98", borderTop: "1px solid #1C1C1C" }}
                      >
                        Showing first 100 rows
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-8">
                    <NoPreview file={file} FileIcon={FileIcon} iconColor={iconColor} />
                  </div>
                )
              )}

              {/* ── SPREADSHEET / ARCHIVE / OTHER ── */}
              {(category === "spreadsheet" || category === "archive" || category === "other") && (
                <div className="w-full h-full flex items-center justify-center p-8">
                  <NoPreview file={file} FileIcon={FileIcon} iconColor={iconColor} />
                </div>
              )}

            </div>
            {/* ── Metadata panel (toggled) ── */}
            <AnimatePresence initial={false}>
              {showMeta && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="shrink-0 overflow-hidden"
                  style={{ borderTop: "1px solid #1C1C1C" }}
                >
                  <div className="px-5 py-4 grid grid-cols-3 gap-x-4 gap-y-3">
                    <MetaCell label="Size"       value={fmtBytes(file.size_bytes)} />
                    <MetaCell label="Type"       value={meta.label} color={iconColor} />
                    <MetaCell label="MIME"       value={file.content_type} mono />
                    {file.created_at && (
                      <MetaCell label="Created"  value={fmtDate(file.created_at)} />
                    )}
                    {file.updated_at && (
                      <MetaCell label="Modified" value={fmtDate(file.updated_at)} />
                    )}
                    {file.uploaded_by && (
                      <MetaCell label="Uploaded by" value={file.uploaded_by} />
                    )}
                    {file.last_accessed_at && (
                      <MetaCell label="Accessed" value={fmtDate(file.last_accessed_at)} />
                    )}
                    {file.checksum && (
                      <MetaCell label="SHA-256"  value={`${file.checksum.slice(0, 16)}…`} mono />
                    )}
                    <MetaCell label="ID"         value={`${file.id.slice(0, 8)}…`} mono />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Metadata cell ───────────────────────────────────────────

function MetaCell({
  label,
  value,
  mono = false,
  color,
}: {
  label: string;
  value: string;
  mono?: boolean;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span style={{ fontSize: "10px", fontWeight: 700, color: "#8A8F98", letterSpacing: "0.07em", textTransform: "uppercase" }}>
        {label}
      </span>
      <span
        className="truncate"
        style={{
          fontSize: "12px",
          color: color ?? "#CCCCCC",
          fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
          fontWeight: color ? 600 : 400,
        }}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
