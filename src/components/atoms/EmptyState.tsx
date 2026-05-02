import { AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../ui/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon = AlertTriangle,
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className,
      )}
    >
      <Icon className="w-12 h-12 text-gray-600 mb-4" aria-hidden="true" />
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      {description && <p className="text-gray-400 text-sm">{description}</p>}
    </div>
  );
}
