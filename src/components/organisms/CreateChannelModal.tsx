import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useCreatePublicChannel } from "../../hooks/useChannels";
import { cn } from "../ui/utils";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateChannelModal({ isOpen, onClose }: CreateChannelModalProps) {
  const [channelName, setChannelName] = useState("");
  const { mutate: createChannel, isPending } = useCreatePublicChannel();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = channelName.trim();
    if (!trimmed) return;
    createChannel(trimmed, {
      onSuccess: () => {
        setChannelName("");
        onClose();
      },
    });
  }

  function handleClose() {
    if (isPending) return;
    setChannelName("");
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm mx-4 p-6 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white text-base font-semibold">New Channel</h2>
              <button
                onClick={handleClose}
                aria-label="Close modal"
                disabled={isPending}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  "text-gray-400 hover:text-white hover:bg-gray-800",
                  isPending && "opacity-50 cursor-not-allowed",
                )}
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <label htmlFor="channel-name" className="block text-sm text-gray-400 mb-1.5">
                Channel name
              </label>
              <input
                id="channel-name"
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="e.g. general, ops-team"
                disabled={isPending}
                autoFocus
                className={cn(
                  "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2",
                  "text-white placeholder-gray-500 text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-600",
                  "transition-colors",
                  isPending && "opacity-50 cursor-not-allowed",
                )}
              />

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white",
                    isPending && "opacity-50 cursor-not-allowed",
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !channelName.trim()}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2",
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    "bg-blue-600 text-white hover:bg-blue-500",
                    (isPending || !channelName.trim()) && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  {isPending ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
