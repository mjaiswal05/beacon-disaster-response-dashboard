import { useState } from "react";
import { X, Type, Link, Image, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "../ui/utils";
import { createPost } from "../../services/socials.api";
import { SocialsMediaUploader } from "./SocialsMediaUploader";
import type { PostType } from "../../types/socials.types";

interface CreatePostModalProps {
  isOpen: boolean;
  communityId: string;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
  onCreated: () => void;
}

const POST_TYPE_OPTIONS: { value: PostType; label: string; icon: typeof Type }[] = [
  { value: "text", label: "Text", icon: Type },
  { value: "link", label: "Link", icon: Link },
  { value: "image", label: "Image", icon: Image },
];

export function CreatePostModal({
  isOpen,
  communityId,
  currentUserId,
  currentUserName,
  onClose,
  onCreated,
}: CreatePostModalProps) {
  const [type, setType] = useState<PostType>("text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setIsSubmitting(true);
    try {
      await createPost({
        community_id: communityId,
        author_id: currentUserId,
        author_name: currentUserName,
        title: title.trim(),
        body: body.trim(),
        link_url: linkUrl.trim(),
        image_url: imageUrl.trim(),
        type,
      });
      toast.success("Post created");
      setTitle("");
      setBody("");
      setLinkUrl("");
      setImageUrl("");
      setType("text");
      onCreated();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    background: "#141414",
    border: "1px solid #1C1C1C",
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
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-xl rounded-[20px] overflow-hidden"
            style={{ background: "#0A0A0A", border: "1px solid #1C1C1C" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="p-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid #1C1C1C" }}
            >
              <span className="text-white text-base font-semibold">Create Post</span>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center hover:bg-gray-900 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Type selector */}
              <div className="flex gap-2">
                {POST_TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setType(opt.value)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex-1 justify-center",
                        type === opt.value
                          ? "bg-blue-600 text-white"
                          : "text-gray-400 hover:text-white",
                      )}
                      style={type !== opt.value ? inputStyle : undefined}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Title */}
              <div>
                <label htmlFor="post-title" className="text-xs text-gray-400 font-medium mb-1.5 block">
                  Title *
                </label>
                <input
                  id="post-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter post title…"
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-600 transition-colors"
                  style={inputStyle}
                />
              </div>

              {/* Type-specific field */}
              {type === "text" && (
                <div>
                  <label htmlFor="post-body" className="text-xs text-gray-400 font-medium mb-1.5 block">
                    Body
                  </label>
                  <textarea
                    id="post-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your post…"
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none resize-none"
                    style={inputStyle}
                  />
                </div>
              )}

              {type === "link" && (
                <div>
                  <label htmlFor="post-link" className="text-xs text-gray-400 font-medium mb-1.5 block">
                    Link URL *
                  </label>
                  <input
                    id="post-link"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://…"
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none"
                    style={inputStyle}
                  />
                </div>
              )}

              {type === "image" && (
                <div>
                  <SocialsMediaUploader imageUrl={imageUrl} onImageUrl={setImageUrl} />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white transition-colors"
                  style={inputStyle}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!title.trim() || isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" strokeWidth={1.5} />
                  {isSubmitting ? "Posting…" : "Create Post"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
