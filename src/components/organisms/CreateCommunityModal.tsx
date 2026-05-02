import { useState, useEffect } from "react";
import { X, Users, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createCommunity } from "../../services/socials.api";

interface CreateCommunityModalProps {
  isOpen: boolean;
  currentUserId: string;
  onClose: () => void;
  onCreated: () => void;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const inputStyle = { background: "#141414", border: "1px solid #1C1C1C" };

export function CreateCommunityModal({
  isOpen,
  currentUserId,
  onClose,
  onCreated,
}: CreateCommunityModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-derive slug from name unless user edited it manually
  useEffect(() => {
    if (!slugEdited) setSlug(toSlug(name));
  }, [name, slugEdited]);

  const handleClose = () => {
    setName("");
    setSlug("");
    setSlugEdited(false);
    setDescription("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!slug.trim()) { toast.error("Slug is required"); return; }
    setIsSubmitting(true);
    try {
      await createCommunity({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        user_id: currentUserId,
      });
      toast.success(`Community "${name.trim()}" created`);
      handleClose();
      onCreated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create community");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md rounded-[20px] overflow-hidden"
            style={{ background: "#0A0A0A", border: "1px solid #1C1C1C" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="p-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid #1C1C1C" }}
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-500" strokeWidth={1.5} />
                <span className="text-white text-base font-semibold">Create Community</span>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center hover:bg-gray-900 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="community-name" className="text-xs text-gray-400 font-medium mb-1.5 block">
                  Community Name *
                </label>
                <input
                  id="community-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Emergency Responders"
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-600 transition-colors"
                  style={inputStyle}
                />
              </div>

              {/* Slug */}
              <div>
                <label htmlFor="community-slug" className="text-xs text-gray-400 font-medium mb-1.5 block">
                  Slug *{" "}
                  <span className="text-gray-600 font-normal">(URL-safe, unique)</span>
                </label>
                <div className="flex items-center rounded-xl overflow-hidden" style={inputStyle}>
                  <span className="pl-3 text-gray-500 text-sm select-none shrink-0">b/</span>
                  <input
                    id="community-slug"
                    value={slug}
                    onChange={(e) => { setSlug(toSlug(e.target.value)); setSlugEdited(true); }}
                    placeholder="emergency-responders"
                    className="flex-1 px-2 py-2.5 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="community-desc" className="text-xs text-gray-400 font-medium mb-1.5 block">
                  Description
                </label>
                <textarea
                  id="community-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this community about?"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none resize-none"
                  style={inputStyle}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white transition-colors"
                  style={inputStyle}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!name.trim() || !slug.trim() || isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" strokeWidth={1.5} />
                  {isSubmitting ? "Creating…" : "Create"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
