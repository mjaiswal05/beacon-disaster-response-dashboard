import { Pencil, Trash2 } from "lucide-react";
import type { Template, TemplateCategory } from "../../types/template.types";
import { cn } from "../ui/utils";

interface TemplateCardProps {
  template: Template;
  onEdit: (t: Template) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
}

const CATEGORY_STYLES: Record<
  TemplateCategory,
  { bg: string; text: string; label: string }
> = {
  EVACUATION: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    label: "Evacuation",
  },
  DISASTER_ALERT: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    label: "Disaster Alert",
  },
  ALL_CLEAR: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    label: "All Clear",
  },
  RESOURCE_UPDATE: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    label: "Resource Update",
  },
  GENERAL: {
    bg: "bg-gray-500/10",
    text: "text-gray-400",
    label: "General",
  },
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: "EN",
  es: "ES",
  fr: "FR",
  zh: "ZH",
};

export function TemplateCard({
  template,
  onEdit,
  onDelete,
  canEdit,
}: TemplateCardProps) {
  const categoryStyle =
    CATEGORY_STYLES[template.category] ?? CATEGORY_STYLES.GENERAL;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
      {/* Top row: category badge + language + version */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
            categoryStyle.bg,
            categoryStyle.text,
            "border-current/20",
          )}
        >
          {categoryStyle.label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full font-mono">
            {LANGUAGE_LABELS[template.language] ?? template.language.toUpperCase()}
          </span>
          <span className="text-xs text-gray-600">v{template.version}</span>
        </div>
      </div>

      {/* Template name */}
      <h3 className="text-white font-semibold text-sm leading-snug">
        {template.name}
      </h3>

      {/* Subject */}
      <p
        className="text-gray-400 text-xs truncate"
        title={template.subject}
      >
        {template.subject}
      </p>

      {/* Actions */}
      {canEdit && (
        <div className="flex items-center gap-2 pt-1 border-t border-gray-800 mt-auto">
          <button
            onClick={() => onEdit(template)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-800"
            aria-label={`Edit template ${template.name}`}
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            Edit
          </button>
          <button
            onClick={() => onDelete(template.id)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
            aria-label={`Delete template ${template.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
