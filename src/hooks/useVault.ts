import { useState, useCallback, useEffect } from "react";
import {
  getVaultRoot,
  getVaultFolder,
  addTagToFile,
  removeTagFromFile,
  updateFileDescription,
} from "../services/core.api";
import type { VaultFile, VaultFolder, VaultTag } from "../types/core.types";
import { toast } from "sonner";

export interface VaultState {
  items: VaultFolder[];
  currentFolder: VaultFolder | null;
  isLoading: boolean;
  error: string | null;
}

export function useVaultFolder(folderId: string | null) {
  const [state, setState] = useState<VaultState>({
    items: [],
    currentFolder: null,
    isLoading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      if (folderId === null) {
        const folders = await getVaultRoot();
        setState({ items: folders, currentFolder: null, isLoading: false, error: null });
      } else {
        const folder = await getVaultFolder(folderId);
        setState({ items: [], currentFolder: folder, isLoading: false, error: null });
      }
    } catch (e: any) {
      setState((s) => ({ ...s, isLoading: false, error: e.message || "Failed to load" }));
    }
  }, [folderId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

/** Optimistic tag add — updates file in the given setter immediately,
 *  rolls back and shows an error toast if the API call fails. */
export function useFileTagActions(
  file: VaultFile | null,
  onFileChange: (updated: VaultFile) => void,
) {
  const handleAddTag = useCallback(
    async (tagName: string, color: string) => {
      if (!file) return;

      // Optimistic placeholder tag.
      const tempTag: VaultTag = {
        id: `__temp__${Date.now()}`,
        name: tagName,
        color,
        owner_id: "",
      };
      const optimistic: VaultFile = {
        ...file,
        tags: [...(file.tags ?? []), tempTag],
      };
      onFileChange(optimistic);

      try {
        const realTag = await addTagToFile(file.id, tagName, color);
        // Replace the temp tag with the real one.
        onFileChange({
          ...optimistic,
          tags: optimistic.tags!.map((t) =>
            t.id === tempTag.id ? realTag : t,
          ),
        });
      } catch (e: any) {
        // Roll back.
        onFileChange(file);
        toast.error(e.message || "Failed to add tag");
      }
    },
    [file, onFileChange],
  );

  const handleRemoveTag = useCallback(
    async (tagId: string) => {
      if (!file) return;

      const prev = file;
      const optimistic: VaultFile = {
        ...file,
        tags: (file.tags ?? []).filter((t) => t.id !== tagId),
      };
      onFileChange(optimistic);

      try {
        await removeTagFromFile(file.id, tagId);
      } catch (e: any) {
        onFileChange(prev);
        toast.error(e.message || "Failed to remove tag");
      }
    },
    [file, onFileChange],
  );

  return { handleAddTag, handleRemoveTag };
}

/** Optimistic description save. */
export function useFileDescription(
  file: VaultFile | null,
  onFileChange: (updated: VaultFile) => void,
) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(
    async (description: string) => {
      if (!file || description === (file.description ?? "")) return;

      const prev = file;
      onFileChange({ ...file, description });
      setIsSaving(true);

      try {
        await updateFileDescription(file.id, description);
      } catch (e: any) {
        onFileChange(prev);
        toast.error(e.message || "Failed to save description");
      } finally {
        setIsSaving(false);
      }
    },
    [file, onFileChange],
  );

  return { handleSave, isSaving };
}
