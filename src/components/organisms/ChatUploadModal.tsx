import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle,
  ChevronDown,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  Image as ImageIcon,
  Loader,
  Upload,
  Video,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  confirmUpload,
  getVaultFile,
  getVaultRoot,
  initiateUpload,
} from "../../services/core.api";
import type { VaultFolder } from "../../types/core.types";
import type { AttachedVaultFile } from "../atoms/VaultAttachmentCard";

// ── Design tokens ──────────────────────────────────────────────
const BG     = "#0A0A0A";
const CARD   = "#141414";
const BORDER = "#1C1C1C";
const TEXT   = "#FFFFFF";
const SEC    = "#CCCCCC";
const MUT    = "#8A8F98";
const DIM    = "#4a4a52";
const BLUE   = "#2563EB";
const GREEN  = "#32D74B";
const AMBER  = "#FF9F0A";
const RED    = "#FF453A";

const MAX_MB    = 100;
const MAX_BYTES = MAX_MB * 1024 * 1024;

// ── Helpers ───────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function getIconInfo(mime: string): { color: string; Icon: typeof File } {
  if (mime.startsWith("image/"))  return { color: "#9333EA", Icon: ImageIcon };
  if (mime.startsWith("video/"))  return { color: BLUE,      Icon: Video };
  if (mime.includes("pdf") || mime.includes("doc") || mime.includes("text"))
    return { color: RED, Icon: FileText };
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv"))
    return { color: GREEN, Icon: FileSpreadsheet };
  if (mime.includes("zip") || mime.includes("tar") || mime.includes("archive"))
    return { color: AMBER, Icon: Archive };
  return { color: MUT, Icon: File };
}

// ── Types ──────────────────────────────────────────────────────

type UploadStatus = "idle" | "uploading" | "confirming" | "done" | "error";

interface ChatUploadModalProps {
  onAttach: (file: AttachedVaultFile) => void;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────

export function ChatUploadModal({ onAttach, onClose }: ChatUploadModalProps) {
  const [folders, setFolders]         = useState<VaultFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<VaultFolder | null>(null);
  const [folderOpen, setFolderOpen]   = useState(false);

  const [file, setFile]               = useState<File | null>(null);
  const [status, setStatus]           = useState<UploadStatus>("idle");
  const [progress, setProgress]       = useState(0);
  const [error, setError]             = useState<string | null>(null);
  const [isDragging, setIsDragging]   = useState(false);

  const inputRef  = useRef<HTMLInputElement>(null);
  const xhrRef    = useRef<XMLHttpRequest | null>(null);

  // Load vault root folders
  useEffect(() => {
    getVaultRoot()
      .then((f) => { setFolders(f); if (f.length > 0) setSelectedFolder(f[0]); })
      .catch(() => {})
      .finally(() => setLoadingFolders(false));
  }, []);

  const pickFile = (picked: File | null) => {
    if (!picked) return;
    if (picked.size > MAX_BYTES) {
      setError(`File exceeds ${MAX_MB} MB limit`);
      return;
    }
    setFile(picked);
    setError(null);
    setStatus("idle");
    setProgress(0);
  };

  const handleUpload = useCallback(async () => {
    if (!file || !selectedFolder) return;
    setStatus("uploading");
    setProgress(0);
    setError(null);

    try {
      const { file_id, signed_url } = await initiateUpload({
        folder_id: selectedFolder.id,
        filename: file.name,
        content_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open("PUT", signed_url);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setProgress(Math.round((e.loaded / e.total) * 90));
        };
        xhr.onload  = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      setStatus("confirming");
      setProgress(95);
      await confirmUpload(file_id);
      setProgress(100);

      // Fetch the confirmed file to get a signed download URL
      const vaultFile = await getVaultFile(file_id);
      setStatus("done");

      onAttach({
        id: vaultFile.id,
        filename: vaultFile.filename,
        content_type: vaultFile.content_type,
        size_bytes: vaultFile.size_bytes,
        download_url: vaultFile.download_url,
      });
    } catch (e: any) {
      setStatus("error");
      setError(e.message || "Upload failed");
    }
  }, [file, selectedFolder, onAttach]);

  const busy = status === "uploading" || status === "confirming";

  const { color: fileColor, Icon: FileIcon } = file
    ? getIconInfo(file.type)
    : { color: MUT, Icon: File };

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
        className="w-full max-w-md rounded-[20px] overflow-hidden"
        style={{ background: BG, border: `1px solid ${BORDER}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <div>
            <h2 className="text-white" style={{ fontSize: "15px", fontWeight: 600 }}>
              Upload File
            </h2>
            <p style={{ fontSize: "12px", color: MUT }}>
              Uploads to your vault and shares in chat
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[10px] flex items-center justify-center hover:bg-[#1C1C1C] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" style={{ color: MUT }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Destination folder selector */}
          <div className="relative">
            <p style={{ fontSize: "12px", color: MUT, marginBottom: 6 }}>Save to folder</p>
            <button
              onClick={() => setFolderOpen((v) => !v)}
              disabled={loadingFolders || busy}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors hover:bg-[#1C1C1C] disabled:opacity-50"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}
            >
              {loadingFolders ? (
                <Loader className="w-4 h-4 animate-spin shrink-0" style={{ color: MUT }} />
              ) : (
                <Folder className="w-4 h-4 shrink-0" style={{ color: AMBER }} strokeWidth={1.5} />
              )}
              <span
                className="flex-1 text-left truncate"
                style={{ fontSize: "13px", color: selectedFolder ? SEC : DIM }}
              >
                {loadingFolders
                  ? "Loading folders…"
                  : selectedFolder
                    ? selectedFolder.name
                    : folders.length === 0 ? "No folders — create one in Files first" : "Choose a folder"}
              </span>
              <ChevronDown
                className="w-3.5 h-3.5 shrink-0 transition-transform"
                style={{ color: MUT, transform: folderOpen ? "rotate(180deg)" : "none" }}
              />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {folderOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 right-0 z-10 rounded-[12px] overflow-hidden mt-1.5"
                  style={{ background: "#0D0D0D", border: `1px solid ${BORDER}`, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}
                >
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { setSelectedFolder(f); setFolderOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left"
                      style={{
                        borderBottom: `1px solid ${BORDER}`,
                        background: selectedFolder?.id === f.id ? "rgba(37,99,235,0.12)" : "transparent",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#1A1A1A")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = selectedFolder?.id === f.id ? "rgba(37,99,235,0.12)" : "transparent")}
                    >
                      <Folder className="w-4 h-4 shrink-0" style={{ color: AMBER }} strokeWidth={1.5} />
                      <span style={{ fontSize: "13px", color: TEXT }}>{f.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* File drop zone */}
          {!file ? (
            <div
              role="button"
              tabIndex={0}
              aria-label="Select a file to upload"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const dropped = e.dataTransfer.files[0];
                if (dropped) pickFile(dropped);
              }}
              className="rounded-[14px] cursor-pointer text-center transition-all"
              style={{
                padding: "28px 20px",
                border: `2px dashed ${isDragging ? BLUE : BORDER}`,
                background: isDragging ? "rgba(37,99,235,0.06)" : "transparent",
              }}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
              <Upload
                className="w-7 h-7 mx-auto mb-2.5"
                style={{ color: isDragging ? BLUE : DIM }}
                strokeWidth={1.5}
              />
              <p style={{ fontSize: "14px", fontWeight: 500, color: isDragging ? TEXT : SEC }}>
                Drop a file or click to browse
              </p>
              <p style={{ fontSize: "12px", color: DIM, marginTop: 4 }}>
                Max {MAX_MB} MB · saved to your vault
              </p>
            </div>
          ) : (
            /* Selected file row */
            <div
              className="rounded-[12px] p-3.5"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ background: `${fileColor}18`, border: `1px solid ${fileColor}25` }}
                >
                  <FileIcon className="w-5 h-5" style={{ color: fileColor }} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ fontSize: "13px", fontWeight: 500, color: TEXT }} title={file.name}>
                    {file.name}
                  </p>
                  <p style={{ fontSize: "11px", color: MUT }}>{fmtBytes(file.size)}</p>
                </div>
                {!busy && status !== "done" && (
                  <button
                    onClick={() => { setFile(null); setError(null); setStatus("idle"); }}
                    className="w-7 h-7 rounded-[8px] flex items-center justify-center hover:bg-[#222] transition-colors"
                    aria-label="Remove selected file"
                  >
                    <X className="w-3.5 h-3.5" style={{ color: MUT }} />
                  </button>
                )}
                {status === "done" && (
                  <CheckCircle className="w-5 h-5 shrink-0" style={{ color: GREEN }} />
                )}
              </div>

              {/* Progress bar */}
              {(busy || status === "done") && (
                <div className="mt-3">
                  <div
                    className="w-full rounded-full overflow-hidden"
                    style={{ height: 4, background: "#1C1C1C" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: status === "done" ? GREEN : BLUE }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p style={{ fontSize: "11px", color: MUT, marginTop: 4 }}>
                    {status === "uploading"  && `Uploading… ${progress}%`}
                    {status === "confirming" && "Processing…"}
                    {status === "done"       && "Upload complete — file added to vault"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-[8px]" style={{ background: `${RED}12`, border: `1px solid ${RED}25` }}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: RED }} />
              <p style={{ fontSize: "12px", color: RED }}>{error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-10 rounded-[10px] transition-colors hover:bg-[#1C1C1C]"
              style={{ border: `1px solid ${BORDER}`, fontSize: "13px", fontWeight: 600, color: SEC }}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || !selectedFolder || busy || status === "done"}
              className="flex-1 h-10 rounded-[10px] text-white disabled:opacity-40 transition-opacity hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${BLUE}, #9333EA)`, fontSize: "13px", fontWeight: 600 }}
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  {status === "confirming" ? "Processing…" : "Uploading…"}
                </span>
              ) : status === "done" ? (
                "Done"
              ) : (
                "Upload & Share"
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
