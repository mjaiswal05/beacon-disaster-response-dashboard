import { cn } from "../ui/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: "w-3 h-3",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

export function LoadingSpinner({
  size = "md",
  className,
  label,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center", className)}
      role="status"
      aria-label={label ?? "Loading"}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-gray-600 border-t-blue-500",
          sizeMap[size],
        )}
      />
      {label && <p className="text-gray-400 text-sm mt-3">{label}</p>}
    </div>
  );
}
