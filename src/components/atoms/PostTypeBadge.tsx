import { Type, Link, Image } from "lucide-react";
import { cn } from "../ui/utils";
import type { PostType } from "../../types/socials.types";

const TYPE_CONFIG: Record<
  PostType,
  { icon: typeof Type; label: string; className: string }
> = {
  text: { icon: Type, label: "Text", className: "bg-gray-800 text-gray-300" },
  link: { icon: Link, label: "Link", className: "bg-blue-500/10 text-blue-400" },
  image: { icon: Image, label: "Image", className: "bg-purple-500/10 text-purple-400" },
};

interface PostTypeBadgeProps {
  type: PostType;
}

export function PostTypeBadge({ type }: PostTypeBadgeProps) {
  const { icon: Icon, label, className } = TYPE_CONFIG[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
        className,
      )}
    >
      <Icon className="w-3 h-3" strokeWidth={2} aria-hidden="true" />
      {label}
    </span>
  );
}
