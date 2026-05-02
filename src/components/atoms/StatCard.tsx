import { Card } from "../ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "../ui/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  iconRing: string;
  isLoading?: boolean;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  iconRing,
  isLoading,
}: StatCardProps) {
  return (
    <Card className="bg-card border-border p-4 hover:border-muted-foreground/40 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-xs">{label}</p>
          <h3 className="text-foreground text-lg font-semibold">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-muted-foreground border-t-transparent rounded-full animate-spin" />
                <span className="text-muted-foreground text-sm">
                  Loading...
                </span>
              </div>
            ) : (
              value
            )}
          </h3>
        </div>
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            iconBg,
            iconRing,
          )}
        >
          <Icon className={cn("w-5 h-5", iconColor)} aria-hidden="true" />
        </div>
      </div>
    </Card>
  );
}
