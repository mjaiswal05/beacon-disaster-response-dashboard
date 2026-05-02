import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Folder,
  File,
  Image,
  Video,
  FileText,
  Download,
  Upload,
  Search,
  LayoutGrid,
  List,
  MoreVertical,
  Trash2,
  X,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  FileSpreadsheet,
  Archive,
  UploadCloud,
  Loader,
  PanelRightOpen,
  PanelRightClose,
  Eye,
  Music,
  Code,
  Database,
  Filter,
  ArrowUpDown,
  Check,
  Clock,
  HardDrive,
  Star,
  RotateCcw,
  FolderOpen,
  Square,
  CheckSquare,
  Move,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  bulkDeleteVaultFiles,
  bulkMoveVaultFiles,
  bulkRestoreVaultFiles,
  bulkStarVaultFiles,
  createVaultFolder,
  deleteVaultFile,
  getStarredFiles,
  getVaultBin,
  getVaultFile,
  getVaultFolder,
  getVaultRoot,
  getVaultStats,
  moveVaultFile,
  permanentDeleteVaultFile,
  restoreVaultFile,
  starVaultFile,
  unstarVaultFile,
} from "../../services/core.api";
import { FileUploader } from "../organisms/FileUploader";
import { VaultDetailsPanel } from "../organisms/VaultDetailsPanel";
import { FilePreviewModal } from "../organisms/FilePreviewModal";
import type { VaultFile, VaultFolder, VaultStats } from "../../types/core.types";

// ── Types ──────────────────────────────────────────────────────

interface FileItem {
  id: string;
  name: string;
  type: "folder" | "file";
  fileType?: "document" | "image" | "video" | "audio" | "code" | "spreadsheet" | "archive" | "pdf" | "csv" | "other";
  size?: string;
  sizeBytesRaw?: number;
  modified: string;
  owner: string;
  status?: VaultFile["status"];
  downloadUrl?: string;
  // Rich data for the details panel
  vaultFile?: VaultFile;
  vaultFolder?: VaultFolder;
}

// ── Constants ─────────────────────────────────────────────────

const fileTypeIcons: Record<string, typeof File> = {
  document:     FileText,
  image:        Image,
  video:        Video,
  audio:        Music,
  code:         Code,
  spreadsheet:  FileSpreadsheet,
  archive:      Archive,
  pdf:          FileText,
  csv:          Database,
  other:        File,
};

const fileTypeColors: Record<string, string> = {
  document:     "#FF453A",
  image:        "#9333EA",
  video:        "#2563EB",
  audio:        "#FF375F",
  code:         "#00C7BE",
  spreadsheet:  "#32D74B",
  archive:      "#FF9F0A",
  pdf:          "#FF453A",
  csv:          "#32D74B",
  other:        "#8A8F98",
};

// ── Helpers ───────────────────────────────────────────────────

function mimeToFileType(mime: string): FileItem["fileType"] {
  if (mime.startsWith("image/"))  return "image";
  if (mime.startsWith("video/"))  return "video";
  if (mime.startsWith("audio/"))  return "audio";
  if (mime === "application/pdf") return "pdf";
  if (mime === "text/csv")        return "csv";
  if (
    mime === "application/json" ||
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("x-python") ||
    mime.includes("x-sh")
  ) return "code";
  if (mime.includes("doc") || mime.startsWith("text/")) return "document";
  if (mime.includes("sheet") || mime.includes("excel")) return "spreadsheet";
  if (mime.includes("zip") || mime.includes("tar") || mime.includes("archive") || mime.includes("gzip")) return "archive";
  return "other";
}

function fmtBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function mapVaultFileToItem(f: VaultFile): FileItem {
  return {
    id: f.id,
    name: f.filename,
    type: "file",
    fileType: mimeToFileType(f.content_type),
    size: fmtBytes(f.size_bytes),
    sizeBytesRaw: f.size_bytes,
    modified: f.updated_at,
    owner: f.uploaded_by,
    status: f.status,
    downloadUrl: f.download_url,
    vaultFile: f,
  };
}

function mapVaultFolderToItem(sf: VaultFolder): FileItem {
  return {
    id: sf.id,
    name: sf.name,
    type: "folder",
    modified: sf.updated_at || sf.created_at,
    owner: "",
    vaultFolder: sf,
  };
}

// ── Status indicator ──────────────────────────────────────────

// Only surfaces the PENDING (processing) state — AVAILABLE is the normal/expected
// state so it needs no persistent indicator. A subtle hover affordance is provided
// by the parent card's group-hover classes instead.
function FileStatusDot({ status }: { status?: VaultFile["status"] }) {
  if (status !== "PENDING") return null;
  return (
    <span
      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
      style={{ background: "#FF9F0A", border: "2px solid #0A0A0A" }}
      aria-label="File processing"
    >
      <Loader className="w-2.5 h-2.5 text-white animate-spin" strokeWidth={2.5} />
    </span>
  );
}


// ── Helper sub-components ──────────────────────────────────────

function FileCard({ file, isSelected, onSelect, onToggleSelect, onPreview, onStarToggle, isStarred }: {
  file: VaultFile;
  isSelected: boolean;
  onSelect: (item: any) => void;
  onToggleSelect: (id: string) => void;
  onPreview: (f: VaultFile) => void;
  onStarToggle: (id: string) => void;
  isStarred: boolean;
}) {
  const IconComp = fileTypeIcons[inferFileType(file.content_type)];
  const color = fileTypeColors[inferFileType(file.content_type)];
  return (
    <div
      onClick={() => onSelect({ id: file.id, name: file.filename, type: "file", vaultFile: file, modified: file.updated_at, owner: file.uploaded_by, size: fmtBytes(file.size_bytes), sizeBytesRaw: file.size_bytes })}
      className="rounded-[16px] cursor-pointer transition-all group relative overflow-hidden"
      style={{ background: isSelected ? "rgba(37,99,235,0.08)" : "#141414", border: `1px solid ${isSelected ? "rgba(37,99,235,0.4)" : "#1C1C1C"}` }}
    >
      {/* Icon area */}
      <div className="flex items-center justify-center py-6" style={{ background: `${color}08` }}>
        <div className="w-14 h-14 rounded-[14px] flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}22` }}>
          <IconComp className="w-7 h-7" style={{ color }} strokeWidth={1.5} />
        </div>
      </div>

      {/* Checkbox — top-left */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect(file.id); }}
        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ opacity: isSelected ? 1 : undefined }}
        aria-label={isSelected ? `Deselect ${file.filename}` : `Select ${file.filename}`}
      >
        {isSelected
          ? <CheckSquare className="w-4 h-4" style={{ color: "#2563EB" }} strokeWidth={2} />
          : <Square className="w-4 h-4" style={{ color: "#8A8F98" }} strokeWidth={1.5} />
        }
      </button>

      {/* Star — top-right, always shows if starred */}
      <button
        onClick={(e) => { e.stopPropagation(); onStarToggle(file.id); }}
        className="absolute top-2 right-2 transition-opacity"
        style={{ opacity: isStarred ? 1 : 0 }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = isStarred ? "1" : "0")}
        aria-label={isStarred ? `Unstar ${file.filename}` : `Star ${file.filename}`}
      >
        <Star className="w-3.5 h-3.5" style={{ color: "#FF9F0A" }} fill={isStarred ? "#FF9F0A" : "none"} strokeWidth={1.5} />
      </button>

      {/* Name + size */}
      <div className="px-3 pb-2 pt-2">
        <div className="text-white truncate mb-0.5" style={{ fontSize: "13px", fontWeight: 500 }} title={file.filename}>{file.filename}</div>
        <div style={{ fontSize: "11px", color: "#8A8F98" }}>{fmtBytes(file.size_bytes)}</div>
      </div>

      {/* Hover action row */}
      <div className="flex items-center gap-1 px-2 pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(file); }}
          className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-[8px] hover:bg-[#1C1C1C] transition-colors"
          style={{ fontSize: "11px", color: "#8A8F98" }}
          aria-label={`Preview ${file.filename}`}
        >
          <Eye className="w-3 h-3" strokeWidth={1.5} />
          Preview
        </button>
        <div className="w-px h-4" style={{ background: "#1C1C1C" }} />
        <button
          onClick={(e) => { e.stopPropagation(); onStarToggle(file.id); }}
          className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-[8px] hover:bg-[#1C1C1C] transition-colors"
          style={{ fontSize: "11px", color: isStarred ? "#FF9F0A" : "#8A8F98" }}
          aria-label={isStarred ? "Unstar" : "Star"}
        >
          <Star className="w-3 h-3" fill={isStarred ? "#FF9F0A" : "none"} strokeWidth={1.5} />
          {isStarred ? "Unstar" : "Star"}
        </button>
      </div>
    </div>
  );
}

function inferFileType(contentType?: string): FileItem["fileType"] {
  if (!contentType) return "other";
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "text/csv" || contentType === "application/csv") return "csv";
  if (contentType.includes("spreadsheet") || contentType.includes("excel")) return "spreadsheet";
  if (contentType.includes("zip") || contentType.includes("tar") || contentType.includes("rar") || contentType.includes("7z")) return "archive";
  if (contentType.startsWith("text/")) return "document";
  if (contentType.includes("word") || contentType.includes("document")) return "document";
  return "other";
}

function StarredSection({ starredIds, selectedIds, onToggleSelect, onStarToggle, onPreview, onSelect }: {
  starredIds: Set<string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onStarToggle: (id: string) => void;
  onPreview: (f: VaultFile) => void;
  onSelect: (item: any) => void;
}) {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    setLoading(true);
    getStarredFiles()
      .then(setFiles)
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [starredIds]);

  if (loading) return (
    <div className="flex items-center justify-center py-24" aria-busy="true">
      <Loader className="w-6 h-6 animate-spin" style={{ color: "#8A8F98" }} />
    </div>
  );

  if (files.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 gap-2">
      <Star className="w-12 h-12 mb-2" style={{ color: "#2a2a2a" }} strokeWidth={1} />
      <p style={{ fontSize: "14px", color: "#8A8F98" }}>No starred files yet</p>
      <p style={{ fontSize: "13px", color: "#4a4a52" }}>Star files to find them quickly here</p>
    </div>
  );

  const makeItem = (file: VaultFile) => ({ id: file.id, name: file.filename, type: "file" as const, vaultFile: file, modified: file.updated_at, owner: file.uploaded_by, size: fmtBytes(file.size_bytes), sizeBytesRaw: file.size_bytes });

  return (
    <div className="space-y-3">
      {/* Header row with toggle */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: "13px", color: "#8A8F98", fontWeight: 500 }}>
          {files.length} starred file{files.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1 p-1 rounded-[10px]" style={{ background: "#141414", border: "1px solid #1C1C1C" }}>
          <button
            onClick={() => setViewMode("grid")}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-colors"
            style={{ background: viewMode === "grid" ? "#1C1C1C" : "transparent", color: viewMode === "grid" ? "#FFFFFF" : "#4a4a52" }}
            aria-label="Grid view" aria-pressed={viewMode === "grid"}
          >
            <LayoutGrid className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-colors"
            style={{ background: viewMode === "list" ? "#1C1C1C" : "transparent", color: viewMode === "list" ? "#FFFFFF" : "#4a4a52" }}
            aria-label="List view" aria-pressed={viewMode === "list"}
          >
            <List className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === "grid" ? (
          <motion.div
            key="starred-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
          >
            {files.map((file, i) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2, delay: i * 0.04, ease: "easeOut" }}
              >
                <FileCard
                  file={file}
                  isSelected={selectedIds.has(file.id)}
                  onSelect={onSelect}
                  onToggleSelect={onToggleSelect}
                  onPreview={onPreview}
                  onStarToggle={onStarToggle}
                  isStarred={true}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="starred-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="rounded-[16px] overflow-hidden"
            style={{ border: "1px solid #1C1C1C" }}
          >
            {files.map((file, i) => {
              const IconComp = fileTypeIcons[inferFileType(file.content_type)];
              const color = fileTypeColors[inferFileType(file.content_type)];
              const isSelected = selectedIds.has(file.id);
              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18, delay: i * 0.03, ease: "easeOut" }}
                  onClick={() => onSelect(makeItem(file))}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer group transition-colors hover:bg-[#1A1A1A]"
                  style={{ borderBottom: i < files.length - 1 ? "1px solid #141414" : "none", background: isSelected ? "rgba(37,99,235,0.06)" : "#141414" }}
                >
                  <button onClick={(e) => { e.stopPropagation(); onToggleSelect(file.id); }} className="shrink-0" aria-label="Select">
                    {isSelected ? <CheckSquare className="w-4 h-4" style={{ color: "#2563EB" }} strokeWidth={2} /> : <Square className="w-4 h-4" style={{ color: "#4a4a52" }} strokeWidth={1.5} />}
                  </button>
                  <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}20` }}>
                    <IconComp className="w-4 h-4" style={{ color }} strokeWidth={1.5} />
                  </div>
                  <span className="flex-1 text-white truncate" style={{ fontSize: "14px", fontWeight: 500 }}>{file.filename}</span>
                  <span style={{ fontSize: "12px", color: "#8A8F98" }}>{fmtBytes(file.size_bytes)}</span>
                  <span style={{ fontSize: "12px", color: "#4a4a52" }}>{new Date(file.updated_at).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onPreview(file); }} className="w-7 h-7 rounded-[7px] flex items-center justify-center hover:bg-[#1C1C1C] transition-colors" aria-label="Preview">
                      <Eye className="w-3.5 h-3.5" style={{ color: "#8A8F98" }} strokeWidth={1.5} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onStarToggle(file.id); }} className="w-7 h-7 rounded-[7px] flex items-center justify-center hover:bg-[#1C1C1C] transition-colors" aria-label="Unstar">
                      <Star className="w-3.5 h-3.5" style={{ color: "#FF9F0A" }} fill="#FF9F0A" strokeWidth={1.5} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BinSection({ selectedIds, onToggleSelect, onPreview, onSelect }: {
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onPreview: (f: VaultFile) => void;
  onSelect: (item: any) => void;
}) {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const reload = useCallback(() => {
    setLoading(true);
    getVaultBin().then(setFiles).catch(() => setFiles([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleRestore = useCallback(async (fileId: string) => {
    setRestoringId(fileId);
    try {
      await restoreVaultFile(fileId);
      toast.success("File restored");
      reload();
    } catch (e: any) {
      toast.error(e.message || "Failed to restore file");
    } finally {
      setRestoringId(null);
    }
  }, [reload]);

  const handlePermanentDelete = useCallback(async (fileId: string) => {
    setDeletingId(fileId);
    try {
      await permanentDeleteVaultFile(fileId);
      toast.success("File permanently deleted");
      reload();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete file");
    } finally {
      setDeletingId(null);
    }
  }, [reload]);

  if (loading) return (
    <div className="flex items-center justify-center py-24" aria-busy="true">
      <Loader className="w-6 h-6 animate-spin" style={{ color: "#8A8F98" }} />
    </div>
  );

  if (files.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 gap-2">
      <Trash2 className="w-12 h-12 mb-2" style={{ color: "#2a2a2a" }} strokeWidth={1} />
      <p style={{ fontSize: "14px", color: "#8A8F98" }}>Bin is empty</p>
    </div>
  );

  const makeItem = (file: VaultFile) => ({ id: file.id, name: file.filename, type: "file" as const, vaultFile: file, modified: file.updated_at, owner: file.uploaded_by, size: fmtBytes(file.size_bytes), sizeBytesRaw: file.size_bytes });

  return (
    <div className="space-y-3">
      {/* Header row with toggle */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: "13px", color: "#8A8F98", fontWeight: 500 }}>
          {files.length} deleted file{files.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1 p-1 rounded-[10px]" style={{ background: "#141414", border: "1px solid #1C1C1C" }}>
          <button
            onClick={() => setViewMode("grid")}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-colors"
            style={{ background: viewMode === "grid" ? "#1C1C1C" : "transparent", color: viewMode === "grid" ? "#FFFFFF" : "#4a4a52" }}
            aria-label="Grid view" aria-pressed={viewMode === "grid"}
          >
            <LayoutGrid className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-colors"
            style={{ background: viewMode === "list" ? "#1C1C1C" : "transparent", color: viewMode === "list" ? "#FFFFFF" : "#4a4a52" }}
            aria-label="List view" aria-pressed={viewMode === "list"}
          >
            <List className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === "grid" ? (
          <motion.div
            key="bin-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
          >
            {files.map((file, i) => {
              const IconComp = fileTypeIcons[inferFileType(file.content_type)];
              const color = fileTypeColors[inferFileType(file.content_type)];
              const isBusy = restoringId === file.id || deletingId === file.id;
              const isSelected = selectedIds.has(file.id);
              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: i * 0.04, ease: "easeOut" }}
                  onClick={() => onSelect(makeItem(file))}
                  className="rounded-[16px] cursor-pointer group relative overflow-hidden"
                  style={{ background: isSelected ? "rgba(37,99,235,0.08)" : "#141414", border: `1px solid ${isSelected ? "rgba(37,99,235,0.4)" : "#1C1C1C"}`, opacity: isBusy ? 0.5 : 1 }}
                >
                  <div className="flex items-center justify-center py-6" style={{ background: "rgba(255,69,58,0.04)" }}>
                    <div className="w-14 h-14 rounded-[14px] flex items-center justify-center" style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
                      {isBusy ? <Loader className="w-7 h-7 animate-spin" style={{ color }} /> : <IconComp className="w-7 h-7" style={{ color }} strokeWidth={1.5} />}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onToggleSelect(file.id); }} className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: isSelected ? 1 : undefined }} aria-label="Select">
                    {isSelected ? <CheckSquare className="w-4 h-4" style={{ color: "#2563EB" }} strokeWidth={2} /> : <Square className="w-4 h-4" style={{ color: "#8A8F98" }} strokeWidth={1.5} />}
                  </button>
                  <div className="px-3 pb-2 pt-2">
                    <div className="text-white truncate mb-0.5" style={{ fontSize: "13px", fontWeight: 500 }}>{file.filename}</div>
                    <div style={{ fontSize: "11px", color: "#8A8F98" }}>{fmtBytes(file.size_bytes)}</div>
                  </div>
                  <div className="flex items-center gap-1 px-2 pb-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleRestore(file.id)} disabled={isBusy} className="flex-1 flex items-center justify-center gap-1 h-7 rounded-[8px] hover:bg-[#1C1C1C] transition-colors disabled:opacity-40" style={{ fontSize: "11px", color: "#32D74B" }} aria-label="Restore">
                      <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
                      Restore
                    </button>
                    <div className="w-px h-4" style={{ background: "#1C1C1C" }} />
                    <button onClick={() => handlePermanentDelete(file.id)} disabled={isBusy} className="flex-1 flex items-center justify-center gap-1 h-7 rounded-[8px] hover:bg-[#FF453A15] transition-colors disabled:opacity-40" style={{ fontSize: "11px", color: "#FF453A" }} aria-label="Delete forever">
                      <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                      Delete
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="bin-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="rounded-[16px] overflow-hidden"
            style={{ background: "#141414", border: "1px solid #1C1C1C" }}
          >
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #1C1C1C" }}>
                  {["NAME", "SIZE", "DELETED", "ACTIONS"].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5" style={{ fontSize: "12px", color: "#8A8F98", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {files.map((file, i) => {
                  const IconComp = fileTypeIcons[inferFileType(file.content_type)];
                  const color = fileTypeColors[inferFileType(file.content_type)];
                  const isBusy = restoringId === file.id || deletingId === file.id;
                  const isBulkSelected = selectedIds.has(file.id);
                  return (
                    <motion.tr
                      key={file.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.18, delay: i * 0.03, ease: "easeOut" }}
                      className="hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                      onClick={() => onSelect(makeItem(file))}
                      style={{ borderBottom: "1px solid #141414", opacity: isBusy ? 0.5 : 1, background: isBulkSelected ? "rgba(37,99,235,0.08)" : "transparent" }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); onToggleSelect(file.id); }} className="shrink-0" aria-label="Select">
                            {isBulkSelected ? <CheckSquare className="w-4 h-4" style={{ color: "#2563EB" }} strokeWidth={2} /> : <Square className="w-4 h-4" style={{ color: "#4a4a52" }} strokeWidth={1.5} />}
                          </button>
                          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}20` }}>
                            {isBusy ? <Loader className="w-4 h-4 animate-spin" style={{ color }} /> : <IconComp className="w-4 h-4" style={{ color }} strokeWidth={1.5} />}
                          </div>
                          <span className="text-white truncate" style={{ fontSize: "14px", fontWeight: 500 }}>{file.filename}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><span style={{ fontSize: "13px", color: "#8A8F98" }}>{fmtBytes(file.size_bytes)}</span></td>
                      <td className="px-5 py-3.5"><span style={{ fontSize: "13px", color: "#8A8F98" }}>{new Date(file.updated_at).toLocaleDateString()}</span></td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => onPreview(file)} className="w-8 h-8 rounded-[8px] flex items-center justify-center hover:bg-[#1C1C1C] transition-colors" aria-label={`Preview ${file.filename}`}>
                            <Eye className="w-3.5 h-3.5" style={{ color: "#8A8F98" }} strokeWidth={1.5} />
                          </button>
                          <button onClick={() => handleRestore(file.id)} disabled={isBusy} className="flex items-center gap-1.5 h-8 px-3 rounded-[8px] hover:bg-[#1C1C1C] transition-colors disabled:opacity-40" style={{ fontSize: "12px", color: "#32D74B" }} aria-label={`Restore ${file.filename}`}>
                            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                            Restore
                          </button>
                          <button onClick={() => handlePermanentDelete(file.id)} disabled={isBusy} className="w-8 h-8 rounded-[8px] flex items-center justify-center hover:bg-[#1C1C1C] transition-colors disabled:opacity-40" aria-label={`Permanently delete ${file.filename}`}>
                            <Trash2 className="w-3.5 h-3.5" style={{ color: "#FF453A" }} strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MoveDialogFolder({ folder, depth, onSelect, isBusy }: {
  folder: VaultFolder;
  depth: number;
  onSelect: (id: string) => void;
  isBusy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [subFolders, setSubFolders] = useState<VaultFolder[]>([]);

  const toggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!expanded && subFolders.length === 0 && (folder.sub_folders?.length ?? 0) > 0) {
      try {
        const content = await getVaultFolder(folder.id);
        setSubFolders(content.sub_folders ?? []);
      } catch { /* ignore */ }
    }
    setExpanded((v) => !v);
  }, [expanded, subFolders.length, folder.id, folder.sub_folders]);

  const children = expanded ? (subFolders.length > 0 ? subFolders : folder.sub_folders ?? []) : [];

  return (
    <div>
      <div
        className="flex items-center gap-2 w-full px-3 py-2 rounded-[8px] hover:bg-[#141414] transition-colors cursor-pointer"
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {(folder.sub_folders?.length ?? 0) > 0 ? (
          <button onClick={toggle} className="shrink-0" aria-label={expanded ? "Collapse" : "Expand"}>
            <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{ color: "#8A8F98", transform: expanded ? "rotate(90deg)" : "none" }} strokeWidth={1.5} />
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <FolderOpen className="w-4 h-4 shrink-0" style={{ color: "#FF9F0A" }} strokeWidth={1.5} />
        <span className="flex-1 truncate text-left" style={{ fontSize: "14px", color: "#CCCCCC" }}>{folder.name}</span>
        <button
          onClick={() => onSelect(folder.id)}
          disabled={isBusy}
          className="shrink-0 h-6 px-2.5 rounded-[6px] text-white disabled:opacity-40 transition-colors hover:opacity-90"
          style={{ fontSize: "12px", fontWeight: 600, background: "linear-gradient(135deg, #2563EB, #9333EA)" }}
        >
          {isBusy ? "…" : "Move here"}
        </button>
      </div>
      {children.map((sf) => (
        <MoveDialogFolder key={sf.id} folder={sf} depth={depth + 1} onSelect={onSelect} isBusy={isBusy} />
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────

export function FilesPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFolderId = searchParams.get("folder");
  const setCurrentFolderId = useCallback((id: string | null) => {
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      if (id) next.set("folder", id); else next.delete("folder");
      return next;
    });
  }, [setSearchParams]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "modified" | "size">("modified");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileItem | null } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [folderRegistry, setFolderRegistry] = useState<Record<string, { name: string; parentId: string | null }>>({});
  const [items, setItems] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<VaultFolder | null>(null);
  const [vaultStats, setVaultStats] = useState<VaultStats | null>(null);

  // View section: files browser, starred, or bin — persisted in URL (?section=)
  const viewSection = (searchParams.get("section") ?? "files") as "files" | "starred" | "bin";
  const setViewSection = useCallback((section: "files" | "starred" | "bin") => {
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      if (section === "files") next.delete("section"); else next.set("section", section);
      next.delete("file");
      return next;
    });
  }, [setSearchParams]);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Move dialog
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveFolders, setMoveFolders] = useState<VaultFolder[]>([]);
  const [moveFolderId, setMoveFolderId] = useState<string | null>(null);
  const [isBulkMoving, setIsBulkMoving] = useState(false);

  // Star IDs (set of file IDs the current user has starred)
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  // Details panel state
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [freshFile, setFreshFile] = useState<VaultFile | null>(null);

  // Full-page preview state
  const [previewFile, setPreviewFile] = useState<VaultFile | null>(null);

  // URL-sync for open panel file — restores on refresh
  const panelFileId = searchParams.get("file");

  const openFileInPanel = useCallback((item: FileItem) => {
    setSelectedItem(item);
    setPanelOpen(true);
    if (item.type === "file") {
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.set("file", item.id);
        return next;
      }, { replace: true } as any);
    }
  }, [setSearchParams]);

  const closePanelUrl = useCallback(() => {
    setPanelOpen(false);
    setSelectedItem(null);
    setFreshFile(null);
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.delete("file");
      return next;
    }, { replace: true } as any);
  }, [setSearchParams]);

  // Restore file panel from URL on initial mount
  useEffect(() => {
    const fileId = panelFileId;
    if (!fileId) return;
    let cancelled = false;
    getVaultFile(fileId).then((f) => {
      if (cancelled) return;
      setFreshFile(f);
      setSelectedItem(mapVaultFileToItem(f));
      setPanelOpen(true);
    }).catch(() => {
      if (cancelled) return;
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.delete("file");
        return next;
      }, { replace: true } as any);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run only on mount

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSelectedIds(new Set());
    try {
      if (currentFolderId === null) {
        const folders = await getVaultRoot();
        setItems(folders.map(mapVaultFolderToItem));
        setCurrentFolder(null);
      } else {
        const folder = await getVaultFolder(currentFolderId);
        const subFolders = (folder.sub_folders ?? []).map(mapVaultFolderToItem);
        const files = (folder.files ?? []).map(mapVaultFileToItem);
        setItems([...subFolders, ...files]);
        setCurrentFolder(folder);
      }
      // Refresh global vault stats after every load so the quota bar stays current.
      getVaultStats().then(setVaultStats).catch(() => {});
      // Keep starred IDs fresh so star toggles are accurate.
      getStarredFiles().then((files) => setStarredIds(new Set(files.map((f) => f.id)))).catch(() => {});
    } catch (e: any) {
      setError(e.message || "Failed to load files");
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => {
    load();
  }, [load]);

  // Fetch a fresh signed download URL whenever a file is selected in the panel.
  useEffect(() => {
    if (!panelOpen || !selectedItem?.vaultFile) {
      setFreshFile(null);
      return;
    }
    let cancelled = false;
    getVaultFile(selectedItem.vaultFile.id)
      .then((f) => { if (!cancelled) setFreshFile(f); })
      .catch(() => { if (!cancelled) setFreshFile(null); });
    return () => { cancelled = true; };
  }, [panelOpen, selectedItem?.vaultFile?.id]);

  // Keep the details panel in sync when the underlying item is refreshed.
  const handleFileChange = useCallback((updated: VaultFile) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === updated.id ? mapVaultFileToItem(updated) : it,
      ),
    );
    setSelectedItem((prev) =>
      prev?.id === updated.id ? mapVaultFileToItem(updated) : prev,
    );
  }, []);

  const displayItems = useMemo(() => {
    let filtered = items;
    if (searchQuery)
      filtered = filtered.filter((i) =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    if (filterType !== "all")
      filtered = filtered.filter(
        (i) => i.type === "folder" || i.fileType === filterType,
      );
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "modified")
        return new Date(b.modified).getTime() - new Date(a.modified).getTime();
      if (sortBy === "size") {
        if (a.type === "folder") return -1;
        if (b.type === "folder") return 1;
        return (b.sizeBytesRaw ?? 0) - (a.sizeBytesRaw ?? 0);
      }
      return 0;
    });
    return [
      ...sorted.filter((i) => i.type === "folder"),
      ...sorted.filter((i) => i.type === "file"),
    ];
  }, [items, searchQuery, filterType, sortBy]);

  const breadcrumbs = useMemo(() => {
    const crumbs: Array<{ id: string | null; name: string }> = [
      { id: null, name: "Files" },
    ];
    let cur = currentFolderId;
    const chain: Array<{ id: string; name: string }> = [];
    while (cur) {
      const reg = folderRegistry[cur];
      if (reg) {
        chain.unshift({ id: cur, name: reg.name });
        cur = reg.parentId;
      } else {
        chain.unshift({ id: cur, name: cur });
        break;
      }
    }
    return [...crumbs, ...chain];
  }, [currentFolderId, folderRegistry]);

  const stats = useMemo(() => ({
    fileCount: items.filter((i) => i.type === "file").length,
    folderCount: items.filter((i) => i.type === "folder").length,
  }), [items]);

  const handleItemClick = (item: FileItem) => {
    if (item.type === "folder") {
      setFolderRegistry((prev) => ({
        ...prev,
        [item.id]: { name: item.name, parentId: currentFolderId },
      }));
      // Single setSearchParams call — two separate calls would race and the
      // second would overwrite the first since React Router doesn't batch them.
      setPanelOpen(false);
      setSelectedItem(null);
      setFreshFile(null);
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.set("folder", item.id);
        next.delete("file");
        return next;
      });
    } else {
      // Select file and open panel.
      openFileInPanel(item);
    }
  };

  const handleItemSelect = (item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    openFileInPanel(item);
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    // Only fire when clicking the content background, not on a file/folder card.
    if ((e.target as HTMLElement).closest("[data-vault-item]")) return;
    e.preventDefault();
    // Use a sentinel item to represent "no item selected" (empty-space menu).
    setContextMenu({ x: e.clientX, y: e.clientY, item: null });
  };

  const handleNewFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setIsCreatingFolder(true);
    try {
      await createVaultFolder(name, currentFolderId);
      toast.success(`Folder "${name}" created`);
      setNewFolderName("");
      setShowNewFolderModal(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to create folder");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleFileUploaded = useCallback(
    (_fileId: string, _file: globalThis.File) => {
      load();
    },
    [load],
  );

  const handleDelete = async (item: FileItem) => {
    setContextMenu(null);
    if (item.type === "folder") {
      toast.error("Folder deletion is not supported");
      return;
    }
    setDeletingId(item.id);
    try {
      await deleteVaultFile(item.id);
      toast.success(`"${item.name}" deleted`);
      if (selectedItem?.id === item.id) {
        closePanelUrl();
      }
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete file");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (currentFolderId) setShowUploadModal(true);
  };

  const isAtRoot = currentFolderId === null;

  // ── Bulk helpers ────────────────────────────────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkDelete = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      await bulkDeleteVaultFiles(ids);
      toast.success(`${ids.length} file${ids.length > 1 ? "s" : ""} moved to bin`);
      clearSelection();
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete files");
    }
  }, [selectedIds, clearSelection, load]);

  const handleBulkStar = useCallback(async () => {
    const ids = [...selectedIds].filter((id) => !starredIds.has(id));
    if (ids.length === 0) return;
    try {
      await bulkStarVaultFiles(ids);
      setStarredIds((prev) => new Set([...prev, ...ids]));
      toast.success(`${ids.length} file${ids.length > 1 ? "s" : ""} starred`);
      clearSelection();
    } catch (e: any) {
      toast.error(e.message || "Failed to star files");
    }
  }, [selectedIds, starredIds, clearSelection]);

  const handleBulkRestore = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      await bulkRestoreVaultFiles(ids);
      toast.success(`${ids.length} file${ids.length > 1 ? "s" : ""} restored`);
      clearSelection();
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to restore files");
    }
  }, [selectedIds, clearSelection, load]);

  const handleBulkPermanentDelete = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      for (const id of ids) await permanentDeleteVaultFile(id);
      toast.success(`${ids.length} file${ids.length > 1 ? "s" : ""} permanently deleted`);
      clearSelection();
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to permanently delete files");
    }
  }, [selectedIds, clearSelection, load]);

  const openMoveDialog = useCallback(async () => {
    try {
      const folders = await getVaultRoot();
      setMoveFolders(folders);
      setMoveFolderId(null);
      setShowMoveDialog(true);
    } catch { /* ignore */ }
  }, []);

  const openMoveDialogForFile = useCallback(async (fileId: string) => {
    setSelectedIds(new Set([fileId]));
    try {
      const folders = await getVaultRoot();
      setMoveFolders(folders);
      setMoveFolderId(null);
      setShowMoveDialog(true);
    } catch { /* ignore */ }
  }, []);

  const handleMoveTo = useCallback(async (targetId: string) => {
    const ids = [...selectedIds];
    setIsBulkMoving(true);
    try {
      await bulkMoveVaultFiles(ids, targetId);
      toast.success(`${ids.length} file${ids.length > 1 ? "s" : ""} moved`);
      clearSelection();
      setShowMoveDialog(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to move files");
    } finally {
      setIsBulkMoving(false);
    }
  }, [selectedIds, clearSelection, load]);

  const handleStarToggle = useCallback(async (fileId: string) => {
    const isStarred = starredIds.has(fileId);
    try {
      if (isStarred) {
        await unstarVaultFile(fileId);
        setStarredIds((prev) => { const n = new Set(prev); n.delete(fileId); return n; });
      } else {
        await starVaultFile(fileId);
        setStarredIds((prev) => new Set([...prev, fileId]));
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to update star");
    }
  }, [starredIds]);

  return (
    <div
      className="flex h-full"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => { setContextMenu(null); setShowFilterDropdown(false); setShowSortDropdown(false); }}
    >
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 overflow-y-auto px-4 py-4 lg:px-5 lg:py-5 space-y-4" onContextMenu={handleBackgroundContextMenu}>

        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-white mb-1" style={{ fontSize: "26px", fontWeight: 600, lineHeight: 1.15 }}>
              Files
            </h1>
            <p style={{ fontSize: "13px", color: "#8A8F98" }}>
              Central vault for incident reports, field media, and operational documents
            </p>
            {/* Section tabs */}
            <div className="flex items-center gap-1 mt-2.5 flex-wrap">
              {([
                { key: "files",   label: "All Files", icon: Folder   },
                { key: "starred", label: "Starred",   icon: Star     },
                { key: "bin",     label: "Bin",       icon: Trash2   },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => { setViewSection(key); setSelectedIds(new Set()); }}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-[8px] transition-colors"
                  style={{
                    fontSize: "12.5px",
                    fontWeight: viewSection === key ? 600 : 400,
                    background: viewSection === key ? "rgba(59,130,246,0.16)" : "#111111",
                    color: viewSection === key ? "#60A5FA" : "#9CA3AF",
                    border: `1px solid ${viewSection === key ? "rgba(59,130,246,0.35)" : "#1F2937"}`,
                  }}
                  aria-pressed={viewSection === key}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="flex items-center gap-2 h-9 px-3.5 rounded-[10px] cursor-pointer hover:bg-[#1C1C1C] transition-colors"
              style={{ border: "1px solid #1C1C1C", fontSize: "13px", fontWeight: 600, color: "#CCCCCC" }}
            >
              <FolderPlus className="w-4 h-4" />
              <span>New Folder</span>
            </button>
            <button
              onClick={() =>
                currentFolderId
                  ? setShowUploadModal(true)
                  : toast.info("Navigate into a folder to upload files")
              }
              className="flex items-center gap-2 h-9 px-3.5 rounded-[10px] text-white cursor-pointer hover:opacity-90 transition-opacity"
              style={{
                background: "linear-gradient(135deg, #1D4ED8, #2563EB)",
                boxShadow: "0 0 16px rgba(37, 99, 235, 0.2)",
                fontSize: "13px",
                fontWeight: 600,
                opacity: isAtRoot ? 0.5 : 1,
              }}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Files</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: "Files", value: stats.fileCount, icon: File, color: "#EF4444" },
            { label: "Folders", value: stats.folderCount, icon: Folder, color: "#F59E0B" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="px-4 py-3 rounded-[12px]" style={{ background: "#111111", border: "1px solid #1F2937" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white" style={{ fontSize: "24px", fontWeight: 600, lineHeight: 1.1 }}>{value}</div>
                  <div style={{ fontSize: "12px", color: "#9CA3AF" }}>{label}</div>
                </div>
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                  style={{ background: `${color}22`, border: `1px solid ${color}35` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.8} />
                </div>
              </div>
            </div>
          ))}

          <div className="px-4 py-3 rounded-[12px]" style={{ background: "#111111", border: "1px solid #1F2937" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-white" style={{ fontSize: "12px", fontWeight: 600 }}>Storage</div>
              {vaultStats && (
                <span style={{ fontSize: "11px", color: "#9CA3AF" }}>
                  {fmtBytes(vaultStats.used_bytes)} / {fmtBytes(vaultStats.quota_bytes)}
                </span>
              )}
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "#1F2937" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: vaultStats
                    ? `${Math.min(100, Math.round((vaultStats.used_bytes / vaultStats.quota_bytes) * 100))}%`
                    : "0%",
                  background: (() => {
                    if (!vaultStats) return "#3B82F6";
                    const pct = (vaultStats.used_bytes / vaultStats.quota_bytes) * 100;
                    if (pct >= 90) return "#EF4444";
                    if (pct >= 70) return "#F59E0B";
                    return "linear-gradient(90deg, #2563EB, #0EA5E9)";
                  })(),
                }}
              />
            </div>
            <div style={{ fontSize: "11px", color: "#9CA3AF" }}>
              {vaultStats ? `${Math.round((vaultStats.used_bytes / vaultStats.quota_bytes) * 100)}% used` : "Waiting for usage data"}
            </div>
          </div>
        </div>

        {/* Breadcrumb & view toggle */}
        {viewSection === "files" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.id ?? "root"} className="flex items-center gap-2">
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5" style={{ color: "#4a4a52" }} />}
                <button
                  onClick={() => setCurrentFolderId(crumb.id)}
                  style={{
                    fontSize: "14px",
                    fontWeight: idx === breadcrumbs.length - 1 ? 600 : 400,
                    color: idx === breadcrumbs.length - 1 ? "#FFFFFF" : "#8A8F98",
                  }}
                  className="hover:text-[#2563EB] transition-colors"
                >
                  {crumb.name}
                </button>
              </div>
            ))}
            {currentFolder?.stats && (
              <div className="flex items-center gap-1.5 ml-1" style={{ fontSize: "12px", color: "#4a4a52" }}>
                <span>·</span>
                <span style={{ color: "#8A8F98" }}>
                  {currentFolder.stats.total_files} {currentFolder.stats.total_files === 1 ? "file" : "files"}
                  {currentFolder.stats.total_subfolders > 0 && `, ${currentFolder.stats.total_subfolders} ${currentFolder.stats.total_subfolders === 1 ? "folder" : "folders"}`}
                  {currentFolder.stats.total_size_bytes > 0 && ` · ${fmtBytes(currentFolder.stats.total_size_bytes)}`}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(["grid", "list"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="w-9 h-9 rounded-[10px] flex items-center justify-center cursor-pointer transition-colors"
                style={{
                  background: viewMode === mode ? "rgba(37,99,235,0.15)" : "transparent",
                  border: `1px solid ${viewMode === mode ? "rgba(37,99,235,0.3)" : "#1C1C1C"}`,
                }}
                aria-label={`${mode} view`}
                aria-pressed={viewMode === mode}
              >
                {mode === "grid"
                  ? <LayoutGrid className="w-4 h-4" style={{ color: viewMode === mode ? "#2563EB" : "#8A8F98" }} strokeWidth={1.5} />
                  : <List className="w-4 h-4" style={{ color: viewMode === mode ? "#2563EB" : "#8A8F98" }} strokeWidth={1.5} />
                }
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Search & Filters */}
        <div className="flex items-center gap-2.5 flex-wrap lg:flex-nowrap">
          <div className="flex items-center gap-2.5 h-9 px-3.5 rounded-[10px] flex-1 min-w-[220px]" style={{ background: "#111111", border: "1px solid #1F2937" }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: "#8A8F98" }} strokeWidth={1.5} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files and folders..."
              aria-label="Search files and folders"
              className="bg-transparent text-white placeholder-[#4a4a52] focus:outline-none w-full"
              style={{ fontSize: "14px" }}
            />
          </div>
          {/* Filter dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowFilterDropdown((v) => !v); setShowSortDropdown(false); }}
              className="flex items-center gap-2 h-9 px-3 rounded-[10px] cursor-pointer hover:bg-[#1A1A1A] transition-colors"
              style={{ background: "#111111", border: "1px solid #1F2937", fontSize: "13px", color: "#FFFFFF", minWidth: "130px" }}
              aria-label="Filter by file type"
              aria-expanded={showFilterDropdown}
            >
              <Filter className="w-3.5 h-3.5 shrink-0" style={{ color: "#8A8F98" }} strokeWidth={1.5} />
              <span className="flex-1 text-left">
                {filterType === "all" ? "All Types" : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "#8A8F98", transform: showFilterDropdown ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} strokeWidth={1.5} />
            </button>
            <AnimatePresence>
              {showFilterDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full left-0 mt-2 p-1.5 rounded-[12px] z-50"
                  style={{ background: "#0A0A0A", border: "1px solid #1C1C1C", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", minWidth: "180px", maxHeight: "280px", overflowY: "auto" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {[
                    { value: "all",         label: "All Types",    icon: File,          color: "#8A8F98" },
                    { value: "pdf",         label: "PDF",          icon: FileText,      color: "#FF453A" },
                    { value: "document",    label: "Documents",    icon: FileText,      color: "#FF453A" },
                    { value: "image",       label: "Images",       icon: Image,         color: "#9333EA" },
                    { value: "video",       label: "Videos",       icon: Video,         color: "#2563EB" },
                    { value: "audio",       label: "Audio",        icon: Music,         color: "#FF375F" },
                    { value: "spreadsheet", label: "Spreadsheets", icon: FileSpreadsheet, color: "#32D74B" },
                    { value: "csv",         label: "CSV",          icon: Database,      color: "#32D74B" },
                    { value: "code",        label: "Code",         icon: Code,          color: "#00C7BE" },
                    { value: "archive",     label: "Archives",     icon: Archive,       color: "#FF9F0A" },
                  ].map(({ value, label, icon: Icon, color }) => (
                    <button
                      key={value}
                      onClick={() => { setFilterType(value); setShowFilterDropdown(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-[8px] hover:bg-[#141414] transition-colors text-left"
                    >
                      <Icon className="w-4 h-4 shrink-0" style={{ color }} strokeWidth={1.5} />
                      <span style={{ fontSize: "14px", color: filterType === value ? "#FFFFFF" : "#CCCCCC", fontWeight: filterType === value ? 600 : 400 }}>
                        {label}
                      </span>
                      {filterType === value && (
                        <Check className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: "#2563EB" }} strokeWidth={2.5} />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowSortDropdown((v) => !v); setShowFilterDropdown(false); }}
              className="flex items-center gap-2 h-9 px-3 rounded-[10px] cursor-pointer hover:bg-[#1A1A1A] transition-colors"
              style={{ background: "#111111", border: "1px solid #1F2937", fontSize: "13px", color: "#FFFFFF", minWidth: "145px" }}
              aria-label="Sort files"
              aria-expanded={showSortDropdown}
            >
              <ArrowUpDown className="w-3.5 h-3.5 shrink-0" style={{ color: "#8A8F98" }} strokeWidth={1.5} />
              <span className="flex-1 text-left">
                {sortBy === "modified" ? "Modified" : sortBy === "name" ? "Name" : "Size"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "#8A8F98", transform: showSortDropdown ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} strokeWidth={1.5} />
            </button>
            <AnimatePresence>
              {showSortDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full left-0 mt-2 p-1.5 rounded-[12px] z-50"
                  style={{ background: "#0A0A0A", border: "1px solid #1C1C1C", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", minWidth: "180px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {[
                    { value: "modified", label: "Modified Date", icon: Clock      },
                    { value: "name",     label: "Name",          icon: FileText   },
                    { value: "size",     label: "Size",          icon: HardDrive  },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => { setSortBy(value as typeof sortBy); setShowSortDropdown(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-[8px] hover:bg-[#141414] transition-colors text-left"
                    >
                      <Icon className="w-4 h-4 shrink-0" style={{ color: "#8A8F98" }} strokeWidth={1.5} />
                      <span style={{ fontSize: "14px", color: sortBy === value ? "#FFFFFF" : "#CCCCCC", fontWeight: sortBy === value ? 600 : 400 }}>
                        {label}
                      </span>
                      {sortBy === value && (
                        <Check className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: "#2563EB" }} strokeWidth={2.5} />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Drag-to-upload overlay */}
        <AnimatePresence>
          {isDragging && currentFolderId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
              style={{ background: "rgba(0,0,0,0.7)" }}
            >
              <div className="p-12 rounded-[20px]" style={{ background: "#0A0A0A", border: "2px dashed rgba(37,99,235,0.5)" }}>
                <UploadCloud className="w-16 h-16 mx-auto mb-4" style={{ color: "#2563EB" }} strokeWidth={1.5} />
                <div className="text-white text-center" style={{ fontSize: "18px", fontWeight: 600 }}>Drop files to upload</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Starred section ── */}
        <AnimatePresence mode="wait">
          {viewSection === "starred" && (
            <motion.div
              key="starred"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <StarredSection
                starredIds={starredIds}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onStarToggle={handleStarToggle}
                onPreview={(f) => setPreviewFile(f)}
                onSelect={openFileInPanel}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Bin section ── */}
        <AnimatePresence mode="wait">
          {viewSection === "bin" && (
            <motion.div
              key="bin"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <BinSection
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onPreview={(f) => setPreviewFile(f)}
                onSelect={openFileInPanel}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content area — files browser only */}
        {viewSection === "files" && (isLoading ? (
          <div className="flex items-center justify-center py-24" aria-busy="true" aria-label="Loading files">
            <Loader className="w-6 h-6 animate-spin" style={{ color: "#8A8F98" }} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p style={{ fontSize: "14px", color: "#FF453A" }} role="alert">{error}</p>
            <button onClick={load} className="h-9 px-4 rounded-[10px] text-white transition-colors hover:bg-[#222]" style={{ background: "#1C1C1C", fontSize: "14px" }}>
              Retry
            </button>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2">
            <Folder className="w-12 h-12 mb-2" style={{ color: "#2a2a2a" }} strokeWidth={1} />
            <p style={{ fontSize: "14px", color: "#8A8F98" }}>
              {searchQuery ? "No results found" : "This folder is empty"}
            </p>
            {!searchQuery && !isAtRoot && (
              <p style={{ fontSize: "13px", color: "#4a4a52" }}>Upload files or create a subfolder to get started</p>
            )}
            {!searchQuery && isAtRoot && (
              <p style={{ fontSize: "13px", color: "#4a4a52" }}>Create a folder to get started</p>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* ── Grid view ── */
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
            {displayItems.map((item, idx) => {
              const FileIcon = item.type === "folder" ? Folder : fileTypeIcons[item.fileType ?? "other"];
              const iconColor = item.type === "folder" ? "#FF9F0A" : fileTypeColors[item.fileType ?? "other"];
              const isDeleting = deletingId === item.id;
              const isSelected = selectedItem?.id === item.id;
              const isBulkSelected = selectedIds.has(item.id);
              const isFileStarred = item.type === "file" && starredIds.has(item.id);
              const stats = item.vaultFolder?.stats;

              return (
                <motion.div
                  key={item.id}
                  data-vault-item="true"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => !isDeleting && handleItemClick(item)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  className="p-3 rounded-[14px] cursor-pointer hover:bg-[#1A1A1A] transition-all group relative"
                  style={{
                    background: isBulkSelected ? "rgba(37,99,235,0.08)" : isSelected ? "#181830" : "#141414",
                    border: `1px solid ${isBulkSelected ? "rgba(37,99,235,0.4)" : isSelected ? "rgba(99,102,241,0.4)" : "#1C1C1C"}`,
                    opacity: isDeleting ? 0.5 : 1,
                  }}
                >
                  {/* Checkbox — visible on hover or when something is selected */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                    className="absolute top-2 left-2 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ opacity: isBulkSelected || selectedIds.size > 0 ? 1 : undefined }}
                    aria-label={isBulkSelected ? `Deselect ${item.name}` : `Select ${item.name}`}
                  >
                    {isBulkSelected
                      ? <CheckSquare className="w-4 h-4" style={{ color: "#2563EB" }} strokeWidth={2} />
                      : <Square className="w-4 h-4" style={{ color: "#4a4a52" }} strokeWidth={1.5} />
                    }
                  </button>
                  <div className="flex items-start justify-between mb-2">
                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                        style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}20` }}
                      >
                        {isDeleting
                          ? <Loader className="w-5 h-5 animate-spin" style={{ color: iconColor }} />
                          : <FileIcon className="w-5 h-5" style={{ color: iconColor }} strokeWidth={1.5} />
                        }
                      </div>
                      {item.type === "file" && <FileStatusDot status={item.status} />}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {item.type === "file" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStarToggle(item.id); }}
                          className="w-6 h-6 rounded-[6px] flex items-center justify-center hover:bg-[#1C1C1C] transition-colors"
                          aria-label={isFileStarred ? `Unstar ${item.name}` : `Star ${item.name}`}
                        >
                          <Star className="w-3.5 h-3.5" style={{ color: isFileStarred ? "#FF9F0A" : "#8A8F98" }} fill={isFileStarred ? "#FF9F0A" : "none"} strokeWidth={1.5} />
                        </button>
                      )}
                      {item.type === "file" && item.vaultFile && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setPreviewFile(item.vaultFile!); }}
                          className="w-6 h-6 rounded-[6px] flex items-center justify-center hover:bg-[#1C1C1C] transition-colors"
                          aria-label={`Preview ${item.name}`}
                        >
                          <Eye className="w-3.5 h-3.5" style={{ color: "#8A8F98" }} />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleContextMenu(e, item); }}
                        className="w-6 h-6 rounded-[6px] flex items-center justify-center hover:bg-[#1C1C1C] transition-colors"
                        aria-label={`More options for ${item.name}`}
                      >
                        <MoreVertical className="w-3.5 h-3.5" style={{ color: "#8A8F98" }} />
                      </button>
                    </div>
                  </div>

                  <div className="text-white mb-1 truncate" style={{ fontSize: "13px", fontWeight: 500 }} title={item.name}>
                    {item.name}
                  </div>

                  {/* Folder stats or file size */}
                  {item.type === "folder" && stats ? (
                    <div style={{ fontSize: "11px", color: "#8A8F98" }}>
                      {stats.total_files} {stats.total_files === 1 ? "file" : "files"}
                      {stats.total_size_bytes > 0 && ` · ${fmtBytes(stats.total_size_bytes)}`}
                    </div>
                  ) : (
                    <div style={{ fontSize: "11px", color: "#8A8F98" }}>
                      {item.type === "folder" ? "Folder" : item.size}
                    </div>
                  )}

                  {/* Tags */}
                  {item.vaultFile?.tags && item.vaultFile.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.vaultFile.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1"
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: `${tag.color}18`,
                            border: `1px solid ${tag.color}30`,
                            fontSize: "10px",
                            color: tag.color,
                            fontWeight: 500,
                          }}
                        >
                          <span
                            className="rounded-full shrink-0"
                            style={{ width: "5px", height: "5px", background: tag.color }}
                          />
                          {tag.name}
                        </span>
                      ))}
                      {item.vaultFile.tags.length > 2 && (
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "#1C1C1C",
                            fontSize: "10px",
                            color: "#8A8F98",
                          }}
                        >
                          +{item.vaultFile.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* ── List view ── */
          <div className="rounded-[16px] overflow-hidden" style={{ background: "#141414", border: "1px solid #1C1C1C" }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #1C1C1C" }}>
                  {["NAME", "OWNER", "MODIFIED", "SIZE", "ACTIONS"].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5" style={{ fontSize: "12px", color: "#8A8F98", fontWeight: 500 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item, idx) => {
                  const FileIcon = item.type === "folder" ? Folder : fileTypeIcons[item.fileType ?? "other"];
                  const iconColor = item.type === "folder" ? "#FF9F0A" : fileTypeColors[item.fileType ?? "other"];
                  const isDeleting = deletingId === item.id;
                  const isSelected = selectedItem?.id === item.id;
                  const stats = item.vaultFolder?.stats;

                  return (
                    <motion.tr
                      key={item.id}
                      data-vault-item="true"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => !isDeleting && handleItemClick(item)}
                      onContextMenu={(e) => handleContextMenu(e, item)}
                      className="cursor-pointer hover:bg-[#1A1A1A] transition-colors"
                      style={{
                        borderBottom: "1px solid #1C1C1C",
                        opacity: isDeleting ? 0.5 : 1,
                        background: isSelected ? "#181830" : "transparent",
                      }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div
                              className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                              style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}20` }}
                            >
                              {isDeleting
                                ? <Loader className="w-4 h-4 animate-spin" style={{ color: iconColor }} />
                                : <FileIcon className="w-4 h-4" style={{ color: iconColor }} strokeWidth={1.5} />
                              }
                            </div>
                            {item.type === "file" && <FileStatusDot status={item.status} />}
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="text-white" style={{ fontSize: "14px", fontWeight: 500 }}>{item.name}</span>
                            {item.vaultFile?.tags && item.vaultFile.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.vaultFile.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag.id}
                                    className="inline-flex items-center gap-1"
                                    style={{
                                      padding: "1px 5px",
                                      borderRadius: "4px",
                                      background: `${tag.color}18`,
                                      border: `1px solid ${tag.color}30`,
                                      fontSize: "10px",
                                      color: tag.color,
                                      fontWeight: 500,
                                    }}
                                  >
                                    <span
                                      className="rounded-full shrink-0"
                                      style={{ width: "5px", height: "5px", background: tag.color }}
                                    />
                                    {tag.name}
                                  </span>
                                ))}
                                {item.vaultFile.tags.length > 3 && (
                                  <span
                                    style={{
                                      padding: "1px 5px",
                                      borderRadius: "4px",
                                      background: "#1C1C1C",
                                      fontSize: "10px",
                                      color: "#8A8F98",
                                    }}
                                  >
                                    +{item.vaultFile.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span style={{ fontSize: "13px", color: "#CCCCCC" }}>{item.owner || "—"}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span style={{ fontSize: "13px", color: "#CCCCCC" }}>
                          {item.modified ? new Date(item.modified).toLocaleDateString() : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span style={{ fontSize: "13px", color: "#8A8F98" }}>
                          {item.type === "folder"
                            ? stats
                              ? `${fmtBytes(stats.total_size_bytes)} · ${stats.total_files} files`
                              : "—"
                            : item.size}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          {item.type === "file" && item.vaultFile && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setPreviewFile(item.vaultFile!); }}
                              className="w-8 h-8 rounded-[8px] flex items-center justify-center hover:bg-[#1C1C1C] transition-colors"
                              aria-label={`Preview ${item.name}`}
                            >
                              <Eye className="w-3.5 h-3.5" style={{ color: "#8A8F98" }} strokeWidth={1.5} />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleItemSelect(item, e)}
                            className="w-8 h-8 rounded-[8px] flex items-center justify-center hover:bg-[#1C1C1C] transition-colors"
                            aria-label={`View details for ${item.name}`}
                          >
                            <PanelRightOpen className="w-3.5 h-3.5" style={{ color: "#8A8F98" }} strokeWidth={1.5} />
                          </button>
                          {item.type === "file" && item.downloadUrl && (
                            <a
                              href={item.downloadUrl}
                              download={item.name}
                              onClick={(e) => e.stopPropagation()}
                              className="w-8 h-8 rounded-[8px] flex items-center justify-center hover:bg-[#1C1C1C] transition-colors"
                              aria-label={`Download ${item.name}`}
                            >
                              <Download className="w-3.5 h-3.5" style={{ color: "#8A8F98" }} strokeWidth={1.5} />
                            </a>
                          )}
                          {item.type === "file" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                              disabled={isDeleting}
                              className="w-8 h-8 rounded-[8px] flex items-center justify-center hover:bg-[#1C1C1C] transition-colors disabled:opacity-40"
                              aria-label={`Delete ${item.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" style={{ color: "#FF453A" }} strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* ── Bulk action bar ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-[14px]"
            style={{ background: "#0A0A0A", border: "1px solid #1C1C1C", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
          >
            <span className="text-white mr-1" style={{ fontSize: "13px", fontWeight: 600 }}>
              {selectedIds.size} selected
            </span>
            <div className="w-px h-4 mx-1" style={{ background: "#1C1C1C" }} />
            {viewSection === "bin" ? (
              <>
                <button
                  onClick={handleBulkRestore}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-[8px] hover:bg-[#1A1A1A] transition-colors"
                  style={{ fontSize: "13px", color: "#32D74B" }}
                >
                  <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Restore
                </button>
                <button
                  onClick={handleBulkPermanentDelete}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-[8px] hover:bg-[#1A1A1A] transition-colors"
                  style={{ fontSize: "13px", color: "#FF453A" }}
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Delete forever
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={openMoveDialog}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-[8px] hover:bg-[#1A1A1A] transition-colors"
                  style={{ fontSize: "13px", color: "#CCCCCC" }}
                >
                  <Move className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Move
                </button>
                <button
                  onClick={handleBulkStar}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-[8px] hover:bg-[#1A1A1A] transition-colors"
                  style={{ fontSize: "13px", color: "#FF9F0A" }}
                >
                  <Star className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Star
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-[8px] hover:bg-[#1A1A1A] transition-colors"
                  style={{ fontSize: "13px", color: "#FF453A" }}
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Delete
                </button>
              </>
            )}
            <div className="w-px h-4 mx-1" style={{ background: "#1C1C1C" }} />
            <button
              onClick={clearSelection}
              className="w-7 h-7 rounded-[6px] flex items-center justify-center hover:bg-[#1A1A1A] transition-colors"
              aria-label="Clear selection"
            >
              <X className="w-3.5 h-3.5" style={{ color: "#8A8F98" }} strokeWidth={2} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Move dialog ── */}
      <AnimatePresence>
        {showMoveDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(0,0,0,0.85)" }}
            onClick={() => setShowMoveDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-[20px] overflow-hidden"
              style={{ background: "#0A0A0A", border: "1px solid #1C1C1C" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid #1C1C1C" }}>
                <h2 className="text-white" style={{ fontSize: "18px", fontWeight: 600 }}>
                  Move {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} to…
                </h2>
                <button onClick={() => setShowMoveDialog(false)} className="w-7 h-7 rounded-[8px] flex items-center justify-center hover:bg-[#141414]" aria-label="Close">
                  <X className="w-4 h-4" style={{ color: "#8A8F98" }} />
                </button>
              </div>
              <div className="p-3 max-h-72 overflow-y-auto">
                {moveFolders.length === 0 ? (
                  <p className="text-center py-6" style={{ fontSize: "13px", color: "#8A8F98" }}>No folders available</p>
                ) : (
                  moveFolders.map((folder) => (
                    <MoveDialogFolder
                      key={folder.id}
                      folder={folder}
                      depth={0}
                      onSelect={handleMoveTo}
                      isBusy={isBulkMoving}
                    />
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Details panel — fixed overlay drawer ── */}
      <AnimatePresence>
        {panelOpen && selectedItem && (
          <>
            {/* Backdrop */}
            <motion.div
              key="panel-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.45)" }}
              onClick={closePanelUrl}
              aria-hidden="true"
            />
            {/* Draggable panel */}
            <motion.div
              key="panel-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 40, mass: 0.9 }}
              drag="x"
              dragConstraints={{ left: 0, right: 320 }}
              dragElastic={{ left: 0, right: 0.25 }}
              dragMomentum={false}
              onDragEnd={(_e, info) => {
                if (info.offset.x > 90 || info.velocity.x > 400) {
                  closePanelUrl();
                }
              }}
              className="fixed right-0 top-0 bottom-0 z-50 flex"
              style={{ width: 360, touchAction: "pan-y" }}
              aria-label="File details panel"
            >
              {/* Drag handle strip */}
              <div
                className="w-5 flex-none flex items-center justify-center cursor-grab active:cursor-grabbing"
                aria-hidden="true"
              >
                <div
                  className="w-1 h-12 rounded-full"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                />
              </div>
              {/* Panel content */}
              <div className="flex-1 overflow-hidden" style={{ borderLeft: "1px solid #1C1C1C" }}>
                <VaultDetailsPanel
                  file={freshFile ?? selectedItem.vaultFile ?? null}
                  folder={selectedItem.vaultFolder ?? null}
                  onClose={closePanelUrl}
                  onFileChange={handleFileChange}
                  onPreview={(f) => setPreviewFile(f)}
                  isStarred={selectedItem.type === "file" ? starredIds.has(selectedItem.id) : false}
                  onStar={selectedItem.type === "file" ? handleStarToggle : undefined}
                  onMove={selectedItem.type === "file" ? openMoveDialogForFile : undefined}
                  onDelete={selectedItem.type === "file" && (freshFile ?? selectedItem.vaultFile)?.status !== "DELETED"
                    ? (fileId) => {
                        const item = items.find((i) => i.id === fileId);
                        if (item) handleDelete(item);
                        closePanelUrl();
                      }
                    : undefined}
                  onRestore={selectedItem.type === "file" && (freshFile ?? selectedItem.vaultFile)?.status === "DELETED"
                    ? async (fileId) => {
                        try {
                          await restoreVaultFile(fileId);
                          toast.success("File restored");
                          closePanelUrl();
                          load();
                        } catch (e: any) { toast.error(e.message || "Failed to restore"); }
                      }
                    : undefined}
                  onPermanentDelete={selectedItem.type === "file" && (freshFile ?? selectedItem.vaultFile)?.status === "DELETED"
                    ? async (fileId) => {
                        try {
                          await permanentDeleteVaultFile(fileId);
                          toast.success("File permanently deleted");
                          closePanelUrl();
                          load();
                        } catch (e: any) { toast.error(e.message || "Failed to delete"); }
                      }
                    : undefined}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Context menu ── */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-50 p-1.5 rounded-[12px] min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y, background: "#0A0A0A", border: "1px solid #1C1C1C", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Empty-space menu (no item selected) */}
            {!contextMenu.item && (
              <>
                <button
                  onClick={() => { setShowNewFolderModal(true); setContextMenu(null); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-[#141414] transition-colors text-left"
                >
                  <FolderPlus className="w-4 h-4" style={{ color: "#FF9F0A" }} />
                  <span style={{ fontSize: "14px", color: "#FFFFFF" }}>New Folder</span>
                </button>
                <button
                  onClick={() => {
                    setContextMenu(null);
                    currentFolderId ? setShowUploadModal(true) : toast.info("Navigate into a folder to upload files");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-[#141414] transition-colors text-left"
                >
                  <Upload className="w-4 h-4" style={{ color: "#2563EB" }} />
                  <span style={{ fontSize: "14px", color: "#FFFFFF" }}>Upload Files</span>
                </button>
              </>
            )}

            {/* Item-specific menu */}
            {contextMenu.item && (
              <>
                {contextMenu.item.type === "folder" && (
                  <button
                    onClick={() => { handleItemClick(contextMenu.item); setContextMenu(null); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-[#141414] transition-colors text-left"
                  >
                    <Folder className="w-4 h-4" style={{ color: "#FF9F0A" }} />
                    <span style={{ fontSize: "14px", color: "#FFFFFF" }}>Open</span>
                  </button>
                )}
                {contextMenu.item.type === "file" && contextMenu.item.vaultFile && (
                  <button
                    onClick={() => { setPreviewFile(contextMenu.item.vaultFile!); setContextMenu(null); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-[#141414] transition-colors text-left"
                  >
                    <Eye className="w-4 h-4" style={{ color: "#8A8F98" }} />
                    <span style={{ fontSize: "14px", color: "#FFFFFF" }}>Preview</span>
                  </button>
                )}
                <button
                  onClick={() => { handleItemSelect(contextMenu.item, { stopPropagation: () => {} } as any); setContextMenu(null); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-[#141414] transition-colors text-left"
                >
                  <PanelRightOpen className="w-4 h-4" style={{ color: "#8A8F98" }} />
                  <span style={{ fontSize: "14px", color: "#FFFFFF" }}>Details</span>
                </button>
                {contextMenu.item.type === "file" && contextMenu.item.downloadUrl && (
                  <a
                    href={contextMenu.item.downloadUrl}
                    download={contextMenu.item.name}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-[#141414] transition-colors"
                    onClick={() => setContextMenu(null)}
                  >
                    <Download className="w-4 h-4" style={{ color: "#8A8F98" }} />
                    <span style={{ fontSize: "14px", color: "#FFFFFF" }}>Download</span>
                  </a>
                )}
                {contextMenu.item.type === "file" && (
                  <>
                    <button
                      onClick={() => {
                        if (contextMenu.item) { toggleSelect(contextMenu.item.id); }
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-[#141414] transition-colors text-left"
                    >
                      <CheckSquare className="w-4 h-4" style={{ color: "#8A8F98" }} />
                      <span style={{ fontSize: "14px", color: "#FFFFFF" }}>
                        {contextMenu.item && selectedIds.has(contextMenu.item.id) ? "Deselect" : "Select"}
                      </span>
                    </button>
                    <button
                      onClick={async () => {
                        if (contextMenu.item) { await handleStarToggle(contextMenu.item.id); }
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-[#141414] transition-colors text-left"
                    >
                      <Star className="w-4 h-4" style={{ color: "#FF9F0A" }} />
                      <span style={{ fontSize: "14px", color: "#FFFFFF" }}>
                        {contextMenu.item && starredIds.has(contextMenu.item.id) ? "Unstar" : "Star"}
                      </span>
                    </button>
                    <button
                      onClick={async () => {
                        if (contextMenu.item) {
                          setSelectedIds(new Set([contextMenu.item.id]));
                          await openMoveDialog();
                        }
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-[#141414] transition-colors text-left"
                    >
                      <Move className="w-4 h-4" style={{ color: "#8A8F98" }} />
                      <span style={{ fontSize: "14px", color: "#FFFFFF" }}>Move to…</span>
                    </button>
                    <div className="h-px my-1" style={{ background: "#1C1C1C" }} />
                    <button
                      onClick={() => contextMenu.item && handleDelete(contextMenu.item)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-[#141414] transition-colors text-left"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: "#FF453A" }} />
                      <span style={{ fontSize: "14px", color: "#FF453A" }}>Delete</span>
                    </button>
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Full-page file preview ── */}
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      {/* ── New Folder modal ── */}
      <AnimatePresence>
        {showNewFolderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(0,0,0,0.85)" }}
            onClick={() => setShowNewFolderModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-[20px] overflow-hidden"
              style={{ background: "#0A0A0A", border: "1px solid #1C1C1C" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6" style={{ borderBottom: "1px solid #1C1C1C" }}>
                <h2 className="text-white" style={{ fontSize: "20px", fontWeight: 600 }}>Create New Folder</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="folder-name" className="block mb-2" style={{ fontSize: "13px", color: "#8A8F98" }}>Folder Name</label>
                  <input
                    id="folder-name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNewFolder()}
                    placeholder="Enter folder name..."
                    autoFocus
                    className="w-full h-11 px-4 rounded-[12px] bg-transparent text-white placeholder-[#4a4a52] focus:outline-none"
                    style={{ border: "1px solid #1C1C1C", fontSize: "14px" }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowNewFolderModal(false)}
                    className="flex-1 h-10 px-4 rounded-[10px] cursor-pointer hover:bg-[#1C1C1C] transition-colors"
                    style={{ border: "1px solid #1C1C1C", fontSize: "14px", fontWeight: 600, color: "#CCCCCC" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNewFolder}
                    disabled={!newFolderName.trim() || isCreatingFolder}
                    className="flex-1 h-10 px-4 rounded-[10px] text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #2563EB, #9333EA)", fontSize: "14px", fontWeight: 600 }}
                  >
                    {isCreatingFolder ? "Creating…" : "Create"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upload modal ── */}
      <AnimatePresence>
        {showUploadModal && currentFolderId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(0,0,0,0.85)" }}
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl rounded-[20px] overflow-hidden"
              style={{ background: "#0A0A0A", border: "1px solid #1C1C1C" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6" style={{ borderBottom: "1px solid #1C1C1C" }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-white" style={{ fontSize: "20px", fontWeight: 600 }}>Upload Files</h2>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="w-8 h-8 rounded-[10px] flex items-center justify-center hover:bg-[#141414] transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" style={{ color: "#8A8F98" }} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <FileUploader folderId={currentFolderId} onFileUploaded={handleFileUploaded} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
