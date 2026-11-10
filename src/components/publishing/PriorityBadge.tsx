import { AlertTriangle, ArrowDown, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { priorityLabels, type Priority } from "./status";

const priorityStyles: Record<Priority, string> = {
  high: "border-destructive/30 bg-destructive/10 text-destructive",
  medium: "border-border bg-secondary text-secondary-foreground",
  low: "border-border bg-transparent text-muted-foreground",
};

const priorityIcons = {
  high: AlertTriangle,
  medium: Minus,
  low: ArrowDown,
} as const;

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const Icon = priorityIcons[priority];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 whitespace-nowrap text-xs", priorityStyles[priority], className)}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {priorityLabels[priority]}
    </Badge>
  );
}
