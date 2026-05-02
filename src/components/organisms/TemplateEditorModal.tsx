import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CreateTemplatePayload,
  Template,
  TemplateCategory,
  TemplateLanguage,
} from "../../types/template.types";
import { useCreateTemplate, useUpdateTemplate } from "../../hooks/useTemplates";
import {
  renderTemplate,
  extractTemplateVariables,
  TEMPLATE_SAMPLE_VARS,
} from "../../utils/template.utils";
import { backdropVariants, modalVariants } from "../../utils/animations";
import { cn } from "../ui/utils";

interface TemplateEditorModalProps {
  open: boolean;
  template: Template | null;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: "EVACUATION", label: "Evacuation" },
  { value: "DISASTER_ALERT", label: "Disaster Alert" },
  { value: "ALL_CLEAR", label: "All Clear" },
  { value: "RESOURCE_UPDATE", label: "Resource Update" },
  { value: "GENERAL", label: "General" },
];

const LANGUAGES: { value: TemplateLanguage; label: string }[] = [
  { value: "en", label: "English (en)" },
  { value: "es", label: "Spanish (es)" },
  { value: "fr", label: "French (fr)" },
  { value: "zh", label: "Chinese (zh)" },
];

const STANDARD_VARIABLES = Object.keys(TEMPLATE_SAMPLE_VARS);

const INPUT_CLS =
  "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const LABEL_CLS = "block text-xs font-medium text-gray-400 mb-1.5";

export function TemplateEditorModal({
  open,
  template,
  onClose,
  onSaved,
}: TemplateEditorModalProps) {
  const isEdit = template !== null;

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("GENERAL");
  const [language, setLanguage] = useState<TemplateLanguage>("en");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [submitError, setSubmitError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();

  const isSaving =
    createMutation.isPending || updateMutation.isPending;

  // Seed form when editing
  useEffect(() => {
    if (open) {
      if (template) {
        setName(template.name);
        setCategory(template.category);
        setLanguage(template.language);
        setSubject(template.subject);
        setBody(template.body);
      } else {
        setName("");
        setCategory("GENERAL");
        setLanguage("en");
        setSubject("");
        setBody("");
      }
      setSubmitError(null);
    }
  }, [open, template]);

  // Insert variable placeholder at cursor position
  const insertVariable = useCallback((varName: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const placeholder = `{{${varName}}}`;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    ta.setRangeText(placeholder, start, end, "end");
    // Sync React state
    setBody(ta.value);
    ta.focus();
  }, []);

  const handleSave = async () => {
    setSubmitError(null);

    if (!name.trim()) {
      setSubmitError("Template name is required.");
      return;
    }
    if (!subject.trim()) {
      setSubmitError("Subject is required.");
      return;
    }
    if (!body.trim()) {
      setSubmitError("Body is required.");
      return;
    }

    const variables = extractTemplateVariables(body);
    const payload: CreateTemplatePayload = {
      name: name.trim(),
      category,
      language,
      subject: subject.trim(),
      body: body.trim(),
      variables,
    };

    try {
      if (isEdit && template) {
        await updateMutation.mutateAsync({ id: template.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save template";
      setSubmitError(message);
    }
  };

  const preview = renderTemplate(body, TEMPLATE_SAMPLE_VARS);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-label={isEdit ? "Edit template" : "New template"}
        >
          <motion.div
            className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden"
            variants={modalVariants}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
              <h2 className="text-lg font-semibold text-white">
                {isEdit ? "Edit Template" : "New Template"}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Error */}
            {submitError && (
              <div
                className="mx-6 mt-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400"
                role="alert"
                aria-live="assertive"
              >
                {submitError}
              </div>
            )}

            {/* Body — 3 columns */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-800">
                {/* Column 1 — Form fields */}
                <div className="p-6 space-y-4 flex-shrink-0">
                  <div>
                    <label htmlFor="tpl-name" className={LABEL_CLS}>
                      Template Name
                    </label>
                    <input
                      id="tpl-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Flash Flood Evacuation"
                      className={INPUT_CLS}
                    />
                  </div>

                  <div>
                    <label htmlFor="tpl-category" className={LABEL_CLS}>
                      Category
                    </label>
                    <select
                      id="tpl-category"
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as TemplateCategory)
                      }
                      className={cn(INPUT_CLS, "cursor-pointer")}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="tpl-language" className={LABEL_CLS}>
                      Language
                    </label>
                    <select
                      id="tpl-language"
                      value={language}
                      onChange={(e) =>
                        setLanguage(e.target.value as TemplateLanguage)
                      }
                      className={cn(INPUT_CLS, "cursor-pointer")}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="tpl-subject" className={LABEL_CLS}>
                      Subject Line
                    </label>
                    <input
                      id="tpl-subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. URGENT: Evacuation Order"
                      className={INPUT_CLS}
                    />
                  </div>
                </div>

                {/* Column 2 — Body textarea + variable buttons */}
                <div className="p-6 flex flex-col gap-4">
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <label htmlFor="tpl-body" className={LABEL_CLS}>
                        Advisory Body
                      </label>
                      <span className="text-xs text-gray-600">
                        Use {"{{variable_name}}"} placeholders
                      </span>
                    </div>
                    <textarea
                      id="tpl-body"
                      ref={textareaRef}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={12}
                      placeholder={"Dear resident,\n\nAn emergency has been declared for {{zone_name}}. Please evacuate immediately to {{shelter_name}} located at {{shelter_address}}.\n\nStay safe."}
                      className={cn(
                        INPUT_CLS,
                        "font-mono text-xs resize-none flex-1 min-h-[200px]",
                      )}
                    />
                  </div>

                  {/* Variable insert buttons */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">
                      Insert variable:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {STANDARD_VARIABLES.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertVariable(v)}
                          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-mono rounded transition-colors"
                          aria-label={`Insert {{${v}}}`}
                        >
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Column 3 — Preview */}
                <div className="p-6 flex flex-col gap-3 flex-shrink-0">
                  <p className={LABEL_CLS}>Preview</p>
                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex flex-col gap-2 flex-1 min-h-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-600 text-xs text-white font-bold select-none">
                        B
                      </span>
                      <span className="text-xs font-semibold text-blue-400">
                        Beacon
                      </span>
                    </div>
                    {subject.trim() ? (
                      <p className="text-sm font-semibold text-white leading-snug">
                        {renderTemplate(subject, TEMPLATE_SAMPLE_VARS)}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 italic">
                        Subject will appear here
                      </p>
                    )}
                    {preview.trim() ? (
                      <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {preview}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600 italic">
                        Body will appear here
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving…" : isEdit ? "Save Changes" : "Create Template"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
