import { useState, useRef, useEffect } from "react";
import {
  X,
  Copy,
  Check,
  Plus,
  Loader,
  CheckCircle,
  Download,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Video,
  Music,
  Code,
  Archive,
  Database,
  File,
  Maximize2,
  Star,
  Trash2,
  RotateCcw,
  FolderOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { VaultFile, VaultFolder, VaultTag } from "../../types/core.types";
import { useFileTagActions, useFileDescription } from "../../hooks/useVault";

// ── Design tokens ──────────────────────────────────────────

const BG_PAGE  = "#0A0A0A";
const BG_CARD  = "#141414";
const BG_ROW   = "#111111";
const BORDER   = "#1C1C1C";
const TEXT_PRI = "#FFFFFF";
const TEXT_SEC = "#CCCCCC";
const TEXT_MUT = "#8A8F98";
const TEXT_DIM = "#4a4a52";
const BLUE     = "#2563EB";
const GREEN    = "#32D74B";
const AMBER    = "#FF9F0A";
const RED      = "#FF453A";

const TAG_PRESETS = [
  "#6366f1", "#3b82f6", "#10b981",
  "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6",
];

// ── File type helpers ──────────────────────────────────────

function getFileTypeMeta(contentType: string): { icon: typeof File; color: string; label: string } {
  if (contentType.startsWith("image/"))    return { icon: ImageIcon,      color: "#9333EA", label: "Image"       };
  if (contentType.startsWith("video/"))    return { icon: Video,          color: BLUE,      label: "Video"       };
  if (contentType.startsWith("audio/"))    return { icon: Music,          color: "#FF375F", label: "Audio"       };
  if (contentType === "application/pdf")   return { icon: FileText,       color: RED,       label: "PDF"         };
  if (contentType === "text/csv")          return { icon: Database,       color: GREEN,     label: "CSV"         };
  if (contentType.includes("sheet") || contentType.includes("excel"))
                                           return { icon: FileSpreadsheet, color: GREEN,    label: "Spreadsheet" };
  if (contentType.includes("zip") || contentType.includes("tar") || contentType.includes("archive"))
                                           return { icon: Archive,        color: AMBER,     label: "Archive"     };
  if (contentType === "application/json" || contentType.includes("javascript") ||
      contentType.includes("typescript") || contentType.includes("x-python") || contentType.includes("x-sh"))
                                           return { icon: Code,           color: "#00C7BE", label: "Code"        };
  if (contentType.includes("doc") || contentType.startsWith("text/"))
                                           return { icon: FileText,       color: RED,       label: "Document"    };
  return                                          { icon: File,           color: TEXT_MUT,  label: "File"        };
}

// ── Helpers ────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Atoms ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: "10px", fontWeight: 700, color: TEXT_MUT, letterSpacing: "0.1em", textTransform: "uppercase" }}>
      {children}
    </span>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      className="flex items-start justify-between gap-3 px-3 py-2 rounded-[8px]"
      style={{ background: BG_ROW }}
    >
      <span style={{ fontSize: "12px", color: TEXT_MUT, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span className="text-right" style={{ fontSize: "12px", color: TEXT_SEC, wordBreak: "break-all" }}>
        {value}
      </span>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center justify-center w-4 h-4 rounded transition-opacity hover:opacity-70 ml-1"
      aria-label="Copy to clipboard"
    >
      {copied
        ? <Check className="w-3 h-3" style={{ color: GREEN }} />
        : <Copy className="w-3 h-3" style={{ color: TEXT_MUT }} />
      }
    </button>
  );
}

function StatusPill({ status }: { status: VaultFile["status"] }) {
  const cfg = {
    AVAILABLE: { icon: CheckCircle, color: GREEN, bg: `${GREEN}18`, label: "Ready"      },
    PENDING:   { icon: Loader,      color: AMBER, bg: `${AMBER}18`, label: "Processing" },
    DELETED:   { icon: AlertCircle, color: RED,   bg: `${RED}18`,   label: "Deleted"    },
  }[status] ?? { icon: AlertCircle, color: TEXT_MUT, bg: BORDER, label: status };

  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, border: `1px solid ${cfg.color}33` }}
    >
      <Icon
        className={`w-3 h-3 ${status === "PENDING" ? "animate-spin" : ""}`}
        style={{ color: cfg.color }}
        aria-hidden="true"
      />
      <span style={{ fontSize: "11px", color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
    </span>
  );
}

// ── Collapsible section ────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-1 py-2.5 group"
        aria-expanded={open}
      >
        <SectionLabel>{title}</SectionLabel>
        {open
          ? <ChevronUp  className="w-3.5 h-3.5 group-hover:opacity-60 transition-opacity" style={{ color: TEXT_DIM }} />
          : <ChevronDown className="w-3.5 h-3.5 group-hover:opacity-60 transition-opacity" style={{ color: TEXT_DIM }} />
        }
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pb-3 space-y-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Inline preview ─────────────────────────────────────────

function FilePreview({ file }: { file: VaultFile }) {
  const isImage = file.content_type.startsWith("image/");
  const isPdf   = file.content_type === "application/pdf";
  const isAudio = file.content_type.startsWith("audio/");
  const [imgErr, setImgErr] = useState(false);
  const { color } = getFileTypeMeta(file.content_type);

  if (isImage && file.download_url && !imgErr) {
    return (
      <div
        className="w-full rounded-[10px] overflow-hidden flex items-center justify-center"
        style={{ background: BG_PAGE, border: `1px solid ${BORDER}`, minHeight: 140, maxHeight: 200 }}
      >
        <img
          src={file.download_url}
          alt={file.filename}
          className="max-w-full max-h-[200px] object-contain"
          onError={() => setImgErr(true)}
          loading="lazy"
        />
      </div>
    );
  }

  if (isPdf && file.download_url) {
    return (
      <div
        className="w-full rounded-[10px] overflow-hidden"
        style={{ border: `1px solid ${BORDER}`, height: 200 }}
      >
        <iframe
          src={file.download_url}
          title={file.filename}
          width="100%"
          height="100%"
          style={{ border: "none", display: "block" }}
        />
      </div>
    );
  }

  if (isAudio && file.download_url) {
    return (
      <div
        className="w-full rounded-[10px] p-4 flex flex-col items-center gap-3"
        style={{ background: BG_PAGE, border: `1px solid ${BORDER}` }}
      >
        <div
          className="w-12 h-12 rounded-[12px] flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}22` }}
        >
          <Music className="w-6 h-6" style={{ color, strokeWidth: 1.5 }} aria-hidden="true" />
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio src={file.download_url} controls className="w-full" style={{ colorScheme: "dark" }} />
      </div>
    );
  }

  const { icon: FallbackIcon } = getFileTypeMeta(file.content_type);
  return (
    <div
      className="w-full rounded-[10px] flex flex-col items-center justify-center gap-3 py-6"
      style={{ background: BG_PAGE, border: `1px dashed ${BORDER}` }}
    >
      <div
        className="w-12 h-12 rounded-[12px] flex items-center justify-center"
        style={{ background: `${color}15`, border: `1px solid ${color}22` }}
      >
        <FallbackIcon className="w-6 h-6" style={{ color, strokeWidth: 1.3 }} aria-hidden="true" />
      </div>
      <span style={{ fontSize: "11px", color: TEXT_DIM }}>No preview available</span>
      {file.download_url && (
        <a
          href={file.download_url}
          download={file.filename}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] transition-colors hover:bg-[#1C1C1C]"
          style={{ background: BG_CARD, border: `1px solid ${BORDER}`, fontSize: "12px", color: TEXT_SEC }}
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          Download
        </a>
      )}
    </div>
  );
}

// ── Tag editor ─────────────────────────────────────────────

function TagChip({ tag, onRemove }: { tag: VaultTag; onRemove: () => void }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.12 }}
      className="inline-flex items-center gap-1"
      style={{
        padding: "3px 4px 3px 7px",
        borderRadius: "6px",
        background: `${tag.color}14`,
        border: `1px solid ${tag.color}30`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: tag.color }}
        aria-hidden="true"
      />
      <span style={{ fontSize: "11px", color: tag.color, fontWeight: 600, letterSpacing: "0.01em" }}>
        {tag.name}
      </span>
      <button
        onClick={onRemove}
        className="ml-0.5 w-4 h-4 rounded-[4px] flex items-center justify-center transition-all hover:bg-black/20"
        style={{ flexShrink: 0 }}
        aria-label={`Remove tag ${tag.name}`}
      >
        <X className="w-2.5 h-2.5" style={{ color: `${tag.color}99` }} />
      </button>
    </motion.span>
  );
}

function TagEditor({
  tags,
  onAdd,
  onRemove,
}: {
  tags: VaultTag[];
  onAdd: (name: string, color: string) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_PRESETS[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const submit = () => {
    const n = name.trim();
    if (!n) return;
    onAdd(n, color);
    setName("");
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {/* Existing tags */}
      <div className="flex flex-wrap gap-1.5 min-h-[28px] items-start">
        <AnimatePresence mode="popLayout">
          {tags.length === 0 && !open && (
            <motion.span
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ fontSize: "12px", color: TEXT_DIM, paddingTop: 2 }}
            >
              No tags yet
            </motion.span>
          )}
          {tags.map((t) => (
            <TagChip key={t.id} tag={t} onRemove={() => onRemove(t.id)} />
          ))}
        </AnimatePresence>
      </div>

      {/* Add form / button */}
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.13 }}
            className="rounded-[10px] p-3 space-y-2.5"
            style={{ background: BG_ROW, border: `1px solid ${BORDER}` }}
          >
            {/* Color preview + input on one line */}
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: color }}
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                  if (e.key === "Escape") setOpen(false);
                }}
                placeholder="Tag name…"
                maxLength={48}
                className="flex-1 h-7 px-2 rounded-[6px] bg-transparent text-white placeholder-[#4a4a52] focus:outline-none"
                style={{ border: `1px solid ${BORDER}`, fontSize: "12px" }}
                aria-label="New tag name"
              />
            </div>

            {/* Color swatches */}
            <div className="flex gap-1.5 flex-wrap">
              {TAG_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-5 h-5 rounded-full transition-all hover:scale-110 flex items-center justify-center"
                  style={{ background: c }}
                  aria-label={`Select color ${c}`}
                  aria-pressed={color === c}
                >
                  {color === c && (
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-1.5">
              <button
                onClick={submit}
                disabled={!name.trim()}
                className="flex-1 h-7 rounded-[6px] text-white disabled:opacity-40 transition-opacity text-center"
                style={{ background: `linear-gradient(135deg, ${BLUE}, #9333EA)`, fontSize: "11px", fontWeight: 600 }}
              >
                Add tag
              </button>
              <button
                onClick={() => { setOpen(false); setName(""); }}
                className="h-7 px-3 rounded-[6px] transition-colors hover:bg-[#1C1C1C]"
                style={{ border: `1px solid ${BORDER}`, fontSize: "11px", color: TEXT_MUT, background: "transparent" }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-[6px] transition-colors hover:bg-[#1A1A1A]"
            style={{ border: `1px dashed ${BORDER}`, fontSize: "11px", color: TEXT_MUT, background: "transparent" }}
          >
            <Plus className="w-2.5 h-2.5" aria-hidden="true" />
            Add tag
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────

interface VaultDetailsPanelProps {
  file: VaultFile | null;
  folder: VaultFolder | null;
  onClose: () => void;
  onFileChange: (updated: VaultFile) => void;
  onPreview?: (file: VaultFile) => void;
  onDelete?: (fileId: string) => void;
  onMove?: (fileId: string) => void;
  onStar?: (fileId: string) => void;
  isStarred?: boolean;
  onRestore?: (fileId: string) => void;
  onPermanentDelete?: (fileId: string) => void;
}

export function VaultDetailsPanel({ file, folder, onClose, onFileChange, onPreview, onDelete, onMove, onStar, isStarred, onRestore, onPermanentDelete }: VaultDetailsPanelProps) {
  const { handleAddTag, handleRemoveTag } = useFileTagActions(file, onFileChange);
  const { handleSave: saveDesc, isSaving } = useFileDescription(file, onFileChange);
  const [desc, setDesc] = useState(file?.description ?? "");

  useEffect(() => { setDesc(file?.description ?? ""); }, [file?.id, file?.description]);

  const item = file ?? folder;
  if (!item) return null;

  const displayName  = file?.filename ?? folder?.name ?? "";
  const typeMeta     = file ? getFileTypeMeta(file.content_type) : null;
  const FileIcon     = typeMeta?.icon ?? File;
  const fileColor    = typeMeta?.color ?? AMBER;

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: BG_PAGE }}
      aria-label="Details panel"
    >
      {/* ── Header ── */}
      <div
        className="shrink-0 px-4 pt-4 pb-3"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="flex items-start justify-between mb-3">
          {/* File type icon — prominent */}
          <div
            className="w-11 h-11 rounded-[12px] flex items-center justify-center"
            style={{ background: `${fileColor}18`, border: `1px solid ${fileColor}28` }}
            aria-hidden="true"
          >
            <FileIcon className="w-5 h-5" style={{ color: fileColor, strokeWidth: 1.5 }} />
          </div>
          <div className="flex items-center gap-1">
            {file && onPreview && (
              <button
                onClick={() => onPreview(file)}
                className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 transition-colors hover:bg-[#1C1C1C]"
                aria-label="Open full preview"
                title="Full preview"
              >
                <Maximize2 className="w-3.5 h-3.5" style={{ color: TEXT_MUT }} />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 transition-colors hover:bg-[#1C1C1C]"
              aria-label="Close details panel"
            >
              <X className="w-3.5 h-3.5" style={{ color: TEXT_MUT }} />
            </button>
          </div>
        </div>

        {/* Name + type badge */}
        <p
          className="text-white mb-1 leading-snug"
          style={{ fontSize: "14px", fontWeight: 600, wordBreak: "break-all" }}
          title={displayName}
        >
          {displayName}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {typeMeta && (
            <span
              className="px-2 py-0.5 rounded-full"
              style={{ background: `${fileColor}18`, border: `1px solid ${fileColor}28`, fontSize: "10px", fontWeight: 700, color: fileColor, letterSpacing: "0.04em" }}
            >
              {typeMeta.label.toUpperCase()}
            </span>
          )}
          {file && <StatusPill status={file.status} />}
          {!file && folder && (
            <span style={{ fontSize: "12px", color: TEXT_MUT }}>Folder</span>
          )}
        </div>
      </div>

      {/* ── Actions bar ── */}
      {file && (
        <div
          className="shrink-0 px-4 py-3 flex items-center gap-2"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          {file.status !== "DELETED" ? (
            <>
              {file.download_url && (
                <a
                  href={file.download_url}
                  download={file.filename}
                  className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-[8px] text-white transition-opacity hover:opacity-80"
                  style={{ background: `linear-gradient(135deg, ${BLUE}, #9333EA)`, fontSize: "12px", fontWeight: 600 }}
                  aria-label={`Download ${file.filename}`}
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  Download
                </a>
              )}
              {onStar && (
                <button
                  onClick={() => onStar(file.id)}
                  className="h-8 w-8 rounded-[8px] flex items-center justify-center transition-colors hover:bg-[#1C1C1C]"
                  aria-label={isStarred ? "Unstar file" : "Star file"}
                  title={isStarred ? "Unstar" : "Star"}
                  style={{ border: `1px solid ${BORDER}`, flexShrink: 0 }}
                >
                  <Star
                    className="w-3.5 h-3.5"
                    style={{ color: isStarred ? "#FF9F0A" : TEXT_MUT }}
                    fill={isStarred ? "#FF9F0A" : "none"}
                    strokeWidth={1.8}
                  />
                </button>
              )}
              {onMove && (
                <button
                  onClick={() => onMove(file.id)}
                  className="h-8 w-8 rounded-[8px] flex items-center justify-center transition-colors hover:bg-[#1C1C1C]"
                  aria-label="Move to folder"
                  title="Move to…"
                  style={{ border: `1px solid ${BORDER}`, flexShrink: 0 }}
                >
                  <FolderOpen className="w-3.5 h-3.5" style={{ color: TEXT_MUT }} strokeWidth={1.8} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(file.id)}
                  className="h-8 w-8 rounded-[8px] flex items-center justify-center transition-colors hover:bg-[#FF453A1A]"
                  aria-label="Delete file"
                  title="Delete"
                  style={{ border: `1px solid ${BORDER}`, flexShrink: 0 }}
                >
                  <Trash2 className="w-3.5 h-3.5" style={{ color: RED }} strokeWidth={1.8} />
                </button>
              )}
            </>
          ) : (
            <>
              {onRestore && (
                <button
                  onClick={() => onRestore(file.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-[8px] transition-colors hover:opacity-90"
                  style={{ background: `${GREEN}18`, border: `1px solid ${GREEN}33`, fontSize: "12px", fontWeight: 600, color: GREEN }}
                >
                  <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.8} />
                  Restore
                </button>
              )}
              {onPermanentDelete && (
                <button
                  onClick={() => onPermanentDelete(file.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-[8px] transition-colors hover:opacity-90"
                  style={{ background: `${RED}18`, border: `1px solid ${RED}33`, fontSize: "12px", fontWeight: 600, color: RED }}
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                  Delete forever
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-2">

        {/* ─── FILE panels ─── */}
        {file && (
          <>
            <Section title="Preview">
              <FilePreview file={file} />
            </Section>

            <Section title="File Info">
              <MetaRow label="Size"        value={fmtBytes(file.size_bytes)} />
              <MetaRow label="Uploaded by" value={file.uploaded_by || "—"} />
              <MetaRow label="Created"     value={fmtDate(file.created_at)} />
              {file.last_accessed_at && (
                <MetaRow label="Accessed" value={fmtDate(file.last_accessed_at)} />
              )}
              <MetaRow
                label="MIME"
                value={<span style={{ fontFamily: "monospace", fontSize: "11px" }}>{file.content_type}</span>}
              />
              {file.checksum && (
                <MetaRow
                  label="SHA-256"
                  value={
                    <span className="inline-flex items-center">
                      <code style={{ fontSize: "11px" }}>{file.checksum.slice(0, 14)}…</code>
                      <CopyBtn text={file.checksum} />
                    </span>
                  }
                />
              )}
            </Section>

            {/* Extra metadata from file.metadata */}
            {file.metadata && Object.keys(file.metadata).length > 0 && (
              <Section title="Properties">
                {Object.entries(file.metadata).map(([k, v]) => {
                  const label =
                    k === "width"        ? "Width"
                    : k === "height"     ? "Height"
                    : k === "page_count" ? "Pages"
                    : k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                  const display =
                    (k === "width" || k === "height") ? `${v}px` : String(v);
                  return <MetaRow key={k} label={label} value={display} />;
                })}
              </Section>
            )}

            <Section title="Description">
              <div className="space-y-1.5">
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  onBlur={() => saveDesc(desc)}
                  placeholder="Add a description…"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-[10px] bg-transparent text-white placeholder-[#4a4a52] focus:outline-none resize-none"
                  style={{ border: `1px solid ${BORDER}`, fontSize: "13px", lineHeight: 1.55 }}
                  aria-label="File description"
                />
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: "11px", color: TEXT_DIM }}>Auto-saves on blur</span>
                  {isSaving && (
                    <span className="flex items-center gap-1" style={{ fontSize: "11px", color: TEXT_MUT }}>
                      <Loader className="w-3 h-3 animate-spin" aria-hidden="true" />
                      Saving…
                    </span>
                  )}
                </div>
              </div>
            </Section>

            <Section title="Tags">
              <TagEditor tags={file.tags ?? []} onAdd={handleAddTag} onRemove={handleRemoveTag} />
            </Section>
          </>
        )}

        {/* ─── FOLDER panels ─── */}
        {folder && !file && (
          <>
            <Section title="Statistics">
              {folder.stats ? (
                <>
                  <MetaRow label="Total size"  value={fmtBytes(folder.stats.total_size_bytes)} />
                  <MetaRow label="Files"        value={folder.stats.total_files.toLocaleString()} />
                  <MetaRow label="Subfolders"   value={folder.stats.total_subfolders.toLocaleString()} />
                  <MetaRow label="Last updated" value={fmtDate(folder.stats.updated_at)} />
                </>
              ) : (
                <span style={{ fontSize: "12px", color: TEXT_DIM }}>Stats not available</span>
              )}
            </Section>

            <Section title="Details">
              <MetaRow label="Created"  value={fmtDate(folder.created_at)} />
              <MetaRow label="Modified" value={fmtDate(folder.updated_at)} />
              {folder.materialized_path && (
                <MetaRow
                  label="Path"
                  value={
                    <span style={{ fontFamily: "monospace", fontSize: "11px", wordBreak: "break-all" }}>
                      {folder.materialized_path}
                    </span>
                  }
                />
              )}
            </Section>
          </>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
