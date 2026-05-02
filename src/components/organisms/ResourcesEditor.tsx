import { ArrowDown, ArrowUp, Check, FileText, Link, Pencil, Phone, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { ResourceItem, ResourceType } from "../../types/core.types";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

interface ResourcesEditorProps {
  resources: ResourceItem[];
  onChange: (resources: ResourceItem[]) => void;
  incidentAttachments?: { id: string; name: string }[];
}

const TYPE_ICONS: Record<ResourceType, React.ReactNode> = {
  link: <Link className="w-3.5 h-3.5" aria-hidden="true" />,
  phone: <Phone className="w-3.5 h-3.5" aria-hidden="true" />,
  checklist: <span className="text-xs font-bold">✓</span>,
  document: <FileText className="w-3.5 h-3.5" aria-hidden="true" />,
};

const TYPE_LABELS: Record<ResourceType, string> = {
  link: "Link",
  phone: "Phone",
  checklist: "Step",
  document: "File",
};

function emptyItem(type: ResourceType): ResourceItem {
  return { type, label: "" };
}

export function ResourcesEditor({ resources, onChange, incidentAttachments = [] }: ResourcesEditorProps) {
  const [addingType, setAddingType] = useState<ResourceType | null>(null);
  const [draft, setDraft] = useState<ResourceItem>(emptyItem("link"));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ResourceItem | null>(null);

  const remove = (index: number) => onChange(resources.filter((_, i) => i !== index));

  const startEdit = (index: number) => {
    setAddingType(null);
    setEditingIndex(index);
    setEditDraft({ ...resources[index] });
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditDraft(null);
  };

  const confirmEdit = () => {
    if (editingIndex === null || !editDraft || !editDraft.label.trim()) return;

    const next = [...resources];
    next[editingIndex] = { ...editDraft };
    onChange(next);
    cancelEdit();
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...resources];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    onChange(next);
  };

  const confirmAdd = () => {
    if (!draft.label.trim()) return;
    onChange([...resources, { ...draft }]);
    setAddingType(null);
    setDraft(emptyItem("link"));
  };

  return (
    <div className="space-y-2">
      {resources.map((r, i) => (
        <div key={i} className="rounded-lg bg-gray-800 text-sm">
          {editingIndex === i && editDraft ? (
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <span className="flex-shrink-0">{TYPE_ICONS[r.type]}</span>
                <span className="font-medium">Editing {TYPE_LABELS[r.type]}</span>
              </div>
              <input
                autoFocus
                value={editDraft.label}
                onChange={(e) => setEditDraft((d) => (d ? { ...d, label: e.target.value } : d))}
                placeholder="Label (shown to citizens)"
                className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                aria-label="Resource label"
              />
              {r.type === "link" && (
                <input
                  value={editDraft.url ?? ""}
                  onChange={(e) => setEditDraft((d) => (d ? { ...d, url: e.target.value } : d))}
                  placeholder="https://..."
                  className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                  aria-label="Resource URL"
                />
              )}
              {r.type === "phone" && (
                <input
                  value={editDraft.value ?? ""}
                  onChange={(e) => setEditDraft((d) => (d ? { ...d, value: e.target.value } : d))}
                  placeholder="e.g. 999"
                  className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                  aria-label="Phone number"
                />
              )}
              {r.type === "document" && incidentAttachments.length > 0 && (
                <select
                  value={editDraft.vault_file_id ?? ""}
                  onChange={(e) => {
                    const att = incidentAttachments.find((a) => a.id === e.target.value);
                    setEditDraft((d) => (d ? { ...d, vault_file_id: e.target.value, file_name: att?.name ?? "" } : d));
                  }}
                  className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                  aria-label="Select incident attachment"
                >
                  <option value="">Select a file from incident vault…</option>
                  {incidentAttachments.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
              {r.type === "document" && incidentAttachments.length === 0 && (
                <p className="text-gray-400 text-xs">
                  No files attached to this incident yet. Attach files via the incident vault first.
                </p>
              )}
              <div className="flex gap-2">
                <Button onClick={confirmEdit} className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700">
                  <Check className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  Save
                </Button>
                <Button onClick={cancelEdit} variant="outline" className="h-7 px-3 text-xs border-gray-700">
                  <X className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2">
              <span className="text-gray-400 flex-shrink-0">{TYPE_ICONS[r.type]}</span>
              <span className="text-white flex-1 truncate">{r.label}</span>
              {r.url && <span className="text-blue-400 text-xs truncate max-w-[120px]">{r.url}</span>}
              {r.value && <span className="text-green-400 text-xs">{r.value}</span>}
              {r.file_name && <span className="text-purple-400 text-xs truncate max-w-[100px]">{r.file_name}</span>}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || editingIndex !== null}
                  aria-label="Move up"
                  className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === resources.length - 1 || editingIndex !== null}
                  aria-label="Move down"
                  className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(i)}
                  disabled={addingType !== null}
                  aria-label="Edit resource"
                  className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="Remove resource"
                  className="p-0.5 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {addingType && editingIndex === null && (
        <div className="p-3 bg-gray-800 rounded-lg space-y-2 text-sm">
          <p className="text-gray-400 text-xs font-medium">Add {TYPE_LABELS[addingType]}</p>
          <input
            autoFocus
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            placeholder="Label (shown to citizens)"
            className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
            aria-label="Resource label"
          />
          {addingType === "link" && (
            <input
              value={draft.url ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
              placeholder="https://..."
              className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
              aria-label="Resource URL"
            />
          )}
          {addingType === "phone" && (
            <input
              value={draft.value ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
              placeholder="e.g. 999"
              className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
              aria-label="Phone number"
            />
          )}
          {addingType === "document" && incidentAttachments.length > 0 && (
            <select
              value={draft.vault_file_id ?? ""}
              onChange={(e) => {
                const att = incidentAttachments.find((a) => a.id === e.target.value);
                setDraft((d) => ({ ...d, vault_file_id: e.target.value, file_name: att?.name ?? "" }));
              }}
              className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
              aria-label="Select incident attachment"
            >
              <option value="">Select a file from incident vault…</option>
              {incidentAttachments.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
          {addingType === "document" && incidentAttachments.length === 0 && (
            <p className="text-gray-400 text-xs">
              No files attached to this incident yet. Attach files via the incident vault first.
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={confirmAdd} className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700">
              Add
            </Button>
            <Button onClick={() => setAddingType(null)} variant="outline" className="h-7 px-3 text-xs border-gray-700">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!addingType && editingIndex === null && (
        <div className="flex flex-wrap gap-2 pt-1">
          {(["link", "phone", "checklist", "document"] as ResourceType[]).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => { setAddingType(t); setDraft(emptyItem(t)); }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors",
                "border-gray-700 text-gray-400 hover:text-white hover:border-blue-500/50",
              )}
            >
              <Plus className="w-3 h-3" aria-hidden="true" />
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
