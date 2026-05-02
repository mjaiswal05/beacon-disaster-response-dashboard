import { cn } from "../ui/utils";
import { User } from "lucide-react";

interface UserAvatarProps {
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

export function UserAvatar({ name, size = "md", className }: UserAvatarProps) {
  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : null;

  return (
    <div
      className={cn(
        "rounded-full bg-blue-600 flex items-center justify-center font-medium text-white",
        sizeMap[size],
        className,
      )}
      aria-label={name ?? "User avatar"}
    >
      {initials ?? <User className="w-1/2 h-1/2" aria-hidden="true" />}
    </div>
  );
}
