import { useState, useCallback, useEffect } from "react";
import {
  ChevronRight,
  File,
  FileText,
  Folder,
  Image as ImageIcon,
  Loader,
  X,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getVaultRoot, getVaultFolder } from "../../services/core.api";
import type { VaultFile, VaultFolder } from "../../types/core.types";
import type { AttachedVaultFile } from "../atoms/VaultAttachmentCard";

// ── Design tokens ──────────────────────────────────────────────
const BG_PAGE  = "#0A0A0A";
const BG_CARD  = "#141414";
const BG_HOVER = "#1A1A1A";
const BORDER   = "#1C1C1C";
const TEXT_PRI = "#FFFFFF";
const TEXT_SEC = "#CCCCCC";
const TEXT_MUT = "#8A8F98";
const AMBER    = "#FF9F0A";

// ── Helpers ───────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (!bytes) return "0 B";
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

function FileIcon({ mime, size = 16 }: { mime: string; size?: number }) {
  const color = mimeColor(mime);
  const style = { color, strokeWidth: 1.5, width: size, height: size };
  if (mime.startsWith("image/")) return <ImageIcon style={style} />;
  if (mime.includes("pdf") || mime.includes("text") || mime.includes("doc"))
    return <FileText style={style} />;
  return <File style={style} />;
}

// ── Types ──────────────────────────────────────────────────────

interface BreadcrumbEntry {
  id: string | null;
  name: string;
}

interface ChatVaultPickerProps {
  onAttach: (file: AttachedVaultFile) => void;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────

export function ChatVaultPicker({ onAttach, onClose }: ChatVaultPickerProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([
    { id: null, name: "Files" },
  ]);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentFolderId = breadcrumbs[breadcrumbs.length - 1].id;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (currentFolderId === null) {
        const rootFolders = await getVaultRoot();
        setFolders(rootFolders);
        setFiles([]);
      } else {
        const folder = await getVaultFolder(currentFolderId);
        setFolders(folder.sub_folders ?? []);
        setFiles(folder.files ?? []);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load files");
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => {
    load();
  }, [load]);

  const navigateInto = (folder: VaultFolder) => {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateTo = (index: number) => {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  const handleSelectFile = (file: VaultFile) => {
    if (file.status !== "AVAILABLE") return;
    onAttach({
      id: file.id,
      filename: file.filename,
      content_type: file.content_type,
      size_bytes: file.size_bytes,
      download_url: file.download_url,
    });
  };

  const hasContent = folders.length > 0 || files.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 36 }}
        className="w-full max-w-sm rounded-[20px] overflow-hidden flex flex-col"
        style={{ background: BG_PAGE, border: `1px solid ${BORDER}`, maxHeight: "70vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 h-12 shrink-0"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center gap-2">
            {breadcrumbs.length > 1 && (
              <button
                onClick={() => navigateTo(breadcrumbs.length - 2)}
                className="w-7 h-7 rounded-[8px] flex items-center justify-center hover:bg-[#1C1C1C] transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-3.5 h-3.5" style={{ color: TEXT_MUT }} />
              </button>
            )}
            <div className="flex items-center gap-1.5">
              {breadcrumbs.map((crumb, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  {idx > 0 && (
                    <ChevronRight className="w-3 h-3" style={{ color: "#4a4a52" }} />
                  )}
                  <button
                    onClick={() => navigateTo(idx)}
                    className="transition-colors hover:text-white"
                    style={{
                      fontSize: "13px",
                      fontWeight: idx === breadcrumbs.length - 1 ? 600 : 400,
                      color: idx === breadcrumbs.length - 1 ? TEXT_PRI : TEXT_MUT,
                    }}
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[8px] flex items-center justify-center hover:bg-[#1C1C1C] transition-colors"
            aria-label="Close vault picker"
          >
            <X className="w-3.5 h-3.5" style={{ color: TEXT_MUT }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12" aria-busy="true">
              <Loader className="w-5 h-5 animate-spin" style={{ color: TEXT_MUT }} />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-12 px-4">
              <p style={{ fontSize: "13px", color: "#FF453A" }} role="alert">{error}</p>
              <button
                onClick={load}
                className="h-8 px-4 rounded-[8px] text-white"
                style={{ background: "#1C1C1C", fontSize: "13px" }}
              >
                Retry
              </button>
            </div>
          ) : !hasContent ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <Folder className="w-10 h-10 mb-1" style={{ color: "#2a2a2a" }} strokeWidth={1} />
              <p style={{ fontSize: "13px", color: TEXT_MUT }}>
                {currentFolderId ? "This folder is empty" : "No folders yet"}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentFolderId ?? "root"}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.12 }}
              >
                {/* Folders */}
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => navigateInto(folder)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1A1A1A] transition-colors text-left"
                    style={{ borderBottom: `1px solid ${BORDER}` }}
                  >
                    <div
                      className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                      style={{ background: `${AMBER}15`, border: `1px solid ${AMBER}20` }}
                    >
                      <Folder className="w-4 h-4" style={{ color: AMBER, strokeWidth: 1.5 }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="truncate"
                        style={{ fontSize: "13px", fontWeight: 500, color: TEXT_PRI }}
                      >
                        {folder.name}
                      </p>
                      {folder.stats && (
                        <p style={{ fontSize: "11px", color: TEXT_MUT }}>
                          {folder.stats.total_files} {folder.stats.total_files === 1 ? "file" : "files"}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "#4a4a52" }} />
                  </button>
                ))}

                {/* Files */}
                {files.map((file) => {
                  const isReady = file.status === "AVAILABLE";
                  const color   = mimeColor(file.content_type);
                  return (
                    <button
                      key={file.id}
                      onClick={() => handleSelectFile(file)}
                      disabled={!isReady}
                      className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left disabled:opacity-40"
                      style={{
                        borderBottom: `1px solid ${BORDER}`,
                        background: isReady ? "transparent" : undefined,
                      }}
                      onMouseEnter={(e) => isReady && ((e.currentTarget as HTMLElement).style.background = BG_HOVER)}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                      aria-label={`Attach ${file.filename}`}
                    >
                      <div
                        className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                        style={{ background: `${color}15`, border: `1px solid ${color}20` }}
                      >
                        <FileIcon mime={file.content_type} size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="truncate"
                          style={{ fontSize: "13px", fontWeight: 500, color: TEXT_PRI }}
                          title={file.filename}
                        >
                          {file.filename}
                        </p>
                        <p style={{ fontSize: "11px", color: TEXT_MUT }}>
                          {fmtBytes(file.size_bytes)}
                          {!isReady && (
                            <span style={{ color: "#FF9F0A", marginLeft: 6 }}>Processing…</span>
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer hint */}
        <div
          className="px-4 py-2.5 shrink-0"
          style={{ borderTop: `1px solid ${BORDER}` }}
        >
          <p style={{ fontSize: "11px", color: TEXT_MUT, textAlign: "center" }}>
            Click a file to attach it to your message
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
