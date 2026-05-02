import { useState, useEffect, useCallback } from "react";
import { FolderOpen, Loader, X } from "lucide-react";
import { toast } from "sonner";
import { getSocialsVaultFolder, getVaultFile } from "../../services/core.api";
import { FileUploader } from "./FileUploader";
import { ChatVaultPicker } from "./ChatVaultPicker";
import type { AttachedVaultFile } from "../atoms/VaultAttachmentCard";

interface SocialsMediaUploaderProps {
  imageUrl: string;
  onImageUrl: (url: string) => void;
}

export function SocialsMediaUploader({ imageUrl, onImageUrl }: SocialsMediaUploaderProps) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folderLoading, setFolderLoading] = useState(false);
  const [showVaultPicker, setShowVaultPicker] = useState(false);

  useEffect(() => {
    if (folderId || folderLoading) return;
    setFolderLoading(true);
    getSocialsVaultFolder()
      .then((f) => setFolderId(f.id))
      .catch(() => toast.error("Could not load Beacon Socials vault folder"))
      .finally(() => setFolderLoading(false));
  }, [folderId, folderLoading]);

  const handleUploaded = useCallback(async (fileId: string) => {
    try {
      const vf = await getVaultFile(fileId);
      onImageUrl(vf.download_url ?? "");
    } catch {
      toast.error("Could not retrieve image URL from vault");
    }
  }, [onImageUrl]);

  const handleVaultPick = useCallback((file: AttachedVaultFile) => {
    onImageUrl(file.download_url ?? "");
    setShowVaultPicker(false);
  }, [onImageUrl]);

  return (
    <>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-gray-400 font-medium">Image *</label>
        <button
          type="button"
          onClick={() => setShowVaultPicker(true)}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <FolderOpen className="w-3 h-3" strokeWidth={1.5} />
          Pick from Vault
        </button>
      </div>

      {imageUrl ? (
        <div className="relative">
          <img
            src={imageUrl}
            alt="Preview"
            className="rounded-xl max-h-48 object-cover w-full"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
          <button
            type="button"
            onClick={() => onImageUrl("")}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
            aria-label="Remove image"
          >
            <X className="w-3 h-3 text-white" strokeWidth={2} />
          </button>
        </div>
      ) : folderLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader className="w-5 h-5 animate-spin text-gray-500" strokeWidth={1.5} />
        </div>
      ) : folderId ? (
        <FileUploader folderId={folderId} onFileUploaded={handleUploaded} />
      ) : (
        <p className="text-xs text-gray-500 text-center py-4">Vault unavailable — try refreshing</p>
      )}

      {showVaultPicker && (
        <ChatVaultPicker
          onAttach={handleVaultPick}
          onClose={() => setShowVaultPicker(false)}
        />
      )}
    </>
  );
}
