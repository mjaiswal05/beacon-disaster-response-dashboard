import { AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({
  message,
  onRetry,
  className,
}: ErrorMessageProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className,
      )}
      role="alert"
    >
      <AlertTriangle
        className="w-16 h-16 text-red-500 mb-4"
        aria-hidden="true"
      />
      <h3 className="text-white text-xl mb-2">Something went wrong</h3>
      <p className="text-gray-400 mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} className="bg-blue-600 hover:bg-blue-700">
          Try Again
        </Button>
      )}
    </div>
  );
}
