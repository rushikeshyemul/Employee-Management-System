import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AssignmentState, LeaveRequestStatus, TaskPriority, TaskStatus } from "@/types";
import { statusLabel } from "@/lib/tasks/transitions";
import { titleCase } from "@/lib/format";

const statusClass: Record<TaskStatus, string> = {
  backlog: "bg-muted text-muted-foreground",
  todo: "bg-info/10 text-info",
  in_progress: "bg-primary/10 text-primary",
  in_review: "bg-warning/15 text-warning",
  changes_requested: "bg-destructive/10 text-destructive",
  done: "bg-success/15 text-success",
  blocked: "bg-destructive/10 text-destructive",
};

const priorityClass: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-info/10 text-info",
  high: "bg-warning/15 text-warning",
  urgent: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", statusClass[status])}>
      {statusLabel(status)}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant="outline" className={cn("border-transparent capitalize", priorityClass[priority])}>
      {priority}
    </Badge>
  );
}

export function AssignmentBadge({ state }: { state: AssignmentState }) {
  const label: Record<AssignmentState, string> = {
    pending_acceptance: "Pending acceptance",
    accepted: "Accepted",
    clarification_requested: "Clarification requested",
    rejected: "Assignment rejected",
  };
  const tone: Record<AssignmentState, string> = {
    pending_acceptance: "bg-warning/15 text-warning",
    accepted: "bg-success/15 text-success",
    clarification_requested: "bg-info/10 text-info",
    rejected: "bg-destructive/10 text-destructive",
  };
  return (
    <Badge variant="outline" className={cn("border-transparent", tone[state])}>
      {label[state]}
    </Badge>
  );
}

export function RequestStatusBadge({ status }: { status: LeaveRequestStatus | string }) {
  const tone =
    status === "approved"
      ? "bg-success/15 text-success"
      : status === "pending"
        ? "bg-warning/15 text-warning"
        : status === "rejected"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={cn("border-transparent", tone)}>
      {titleCase(status)}
    </Badge>
  );
}

export function EmploymentBadge({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "bg-success/15 text-success"
      : status === "on_leave"
        ? "bg-info/10 text-info"
        : status === "invited"
          ? "bg-warning/15 text-warning"
          : "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={cn("border-transparent", tone)}>
      {titleCase(status)}
    </Badge>
  );
}
