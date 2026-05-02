import { AnimatePresence, motion } from "framer-motion";
import { FileCog, Plus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useDeleteTemplate, useTemplates } from "../../hooks/useTemplates";
import type { Template, TemplateCategory } from "../../types/template.types";
import { fadeUp, pageVariants, staggerContainer } from "../../utils/animations";
import { EmptyState } from "../atoms/EmptyState";
import { TemplateCard } from "../molecules/TemplateCard";
import { TemplateEditorModal } from "../organisms/TemplateEditorModal";
import { cn } from "../ui/utils";

type CategoryFilter = TemplateCategory | "ALL";

const CATEGORY_TABS: { value: CategoryFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "EVACUATION", label: "Evacuation" },
  { value: "DISASTER_ALERT", label: "Disaster Alert" },
  { value: "ALL_CLEAR", label: "All Clear" },
  { value: "RESOURCE_UPDATE", label: "Resource Update" },
  { value: "GENERAL", label: "General" },
];

function TemplateSkeleton() {
  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3"
      aria-busy="true"
      aria-label="Loading template"
    >
      <div className="flex items-center justify-between">
        <div className="h-5 w-28 bg-gray-800 rounded-full animate-pulse" />
        <div className="h-4 w-10 bg-gray-800 rounded-full animate-pulse" />
      </div>
      <div className="h-4 w-3/4 bg-gray-800 rounded animate-pulse" />
      <div className="h-3 w-full bg-gray-800 rounded animate-pulse" />
      <div className="flex gap-1.5">
        <div className="h-5 w-20 bg-gray-800 rounded animate-pulse" />
        <div className="h-5 w-16 bg-gray-800 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function TemplatesManager() {
  const { isSysAdmin } = useAuth();
  const { templates, isLoading, error } = useTemplates();
  const deleteMutation = useDeleteTemplate();

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("ALL");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered =
    activeCategory === "ALL"
      ? templates
      : templates.filter((t) => t.category === activeCategory);

  const handleEdit = (t: Template) => {
    setEditingTemplate(t);
    setIsEditorOpen(true);
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingTemplate(null);
  };

  const handleDelete = async (id: string) => {
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete template";
      setDeleteError(message);
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-gray-950 flex flex-col"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Header */}
      <motion.header
        variants={fadeUp}
        className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-center justify-between flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <FileCog className="w-6 h-6 text-blue-400" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-bold text-white">Advisory Templates</h1>
            <p className="text-sm text-gray-400">
              Manage reusable notification templates for citizen advisories
            </p>
          </div>
        </div>

        {isSysAdmin && (
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Template
          </button>
        )}
      </motion.header>

      {/* Category tabs */}
      <motion.div
        variants={fadeUp}
        className="px-6 pt-5 pb-0 flex-shrink-0"
      >
        <div
          className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none"
          role="tablist"
          aria-label="Filter by category"
        >
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={activeCategory === tab.value}
              onClick={() => setActiveCategory(tab.value)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors flex-shrink-0",
                activeCategory === tab.value
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800",
              )}
            >
              {tab.label}
              {tab.value !== "ALL" && (
                <span className="ml-1.5 text-xs opacity-60">
                  ({templates.filter((t) => t.category === tab.value).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 px-6 py-6">
        {/* Delete error */}
        {deleteError && (
          <div
            className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400"
            role="alert"
            aria-live="assertive"
          >
            {deleteError}
          </div>
        )}

        {/* API error */}
        {error && !isLoading && (
          <div
            className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400"
            role="alert"
          >
            Failed to load templates: {error}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            aria-busy="true"
            aria-label="Loading templates"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <TemplateSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <EmptyState
            icon={FileCog}
            title="No templates found"
            description={
              activeCategory === "ALL"
                ? "Create a new advisory template to get started."
                : `No templates in the ${activeCategory.replace("_", " ")} category.`
            }
            className="mt-16"
          />
        )}

        {/* Grid */}
        {!isLoading && filtered.length > 0 && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((t) => (
                <motion.div key={t.id} variants={fadeUp} layout>
                  <TemplateCard
                    template={t}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    canEdit={isSysAdmin}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Editor modal */}
      <TemplateEditorModal
        open={isEditorOpen}
        template={editingTemplate}
        onClose={handleCloseEditor}
        onSaved={() => {
          /* query cache is invalidated by the mutation hooks */
        }}
      />
    </motion.div>
  );
}
