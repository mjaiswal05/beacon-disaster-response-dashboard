import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../ui/utils";
import { Hash } from "lucide-react";

interface ChannelItemProps {
  id: string;
  name: string;
  unreadCount?: number;
  isActive: boolean;
  onClick: (id: string) => void;
}

const spring = { type: "spring", stiffness: 380, damping: 32 } as const;

export function ChannelItem({
  id,
  name,
  unreadCount,
  isActive,
  onClick,
}: ChannelItemProps) {
  return (
    <motion.button
      onClick={() => onClick(id)}
      whileHover={{ x: isActive ? 0 : 4 }}
      transition={spring}
      className={cn(
        "relative w-full flex items-center gap-2",
        "px-3 py-2 rounded-lg overflow-hidden",
        "text-sm",
        isActive ? "text-white" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {/* Animated active background */}
      {isActive && (
        <motion.span
          layoutId="sidebar-channel-active-pill"
          className="absolute inset-0 bg-blue-600 rounded-lg"
          transition={spring}
        />
      )}
      <Hash
        className="relative z-10 w-4 h-4 flex-shrink-0"
        aria-hidden="true"
      />
      <span className="relative z-10 truncate flex-1 text-left">{name}</span>
      <AnimatePresence>
        {unreadCount && unreadCount > 0 ? (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={spring}
            className="relative z-10 bg-red-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full"
          >
            {unreadCount}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.button>
  );
}
