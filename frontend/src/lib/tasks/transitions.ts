import type {
  CurrentUser,
  Task,
  TaskAction,
  TaskActionDefinition,
  TaskStatus,
} from "@/types";
import { hasPermission } from "@/lib/permissions";

const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  changes_requested: "Changes Requested",
  done: "Done",
  blocked: "Blocked",
};

export const TASK_STATUS_META: {
  id: TaskStatus;
  label: string;
  description: string;
}[] = [
  { id: "backlog", label: "Backlog", description: "Not scheduled yet" },
  { id: "todo", label: "To Do", description: "Accepted and ready to start" },
  { id: "in_progress", label: "In Progress", description: "Work is underway" },
  { id: "in_review", label: "In Review", description: "Waiting on a reviewer" },
  {
    id: "changes_requested",
    label: "Changes Requested",
    description: "The reviewer asked for updates",
  },
  { id: "done", label: "Done", description: "Accepted as complete" },
  { id: "blocked", label: "Blocked", description: "Progress is stopped" },
];

export function statusLabel(status: TaskStatus) {
  return STATUS_LABEL[status];
}

function canReview(user: Pick<CurrentUser, "permissions">) {
  return hasPermission(user.permissions, "tasks.review");
}

function canManageTasks(user: Pick<CurrentUser, "permissions">) {
  return (
    hasPermission(user.permissions, "tasks.assign") ||
    hasPermission(user.permissions, "tasks.view_all")
  );
}

function action(
  definition: TaskActionDefinition,
): TaskActionDefinition {
  return definition;
}

export function getTaskActions(
  task: Pick<
    Task,
    | "status"
    | "assignment_state"
    | "assignee_id"
    | "reviewer_id"
    | "blocked_from"
  >,
  user: Pick<CurrentUser, "id" | "permissions">,
): TaskActionDefinition[] {
  const assignee = task.assignee_id === user.id;
  const reviewer =
    task.reviewer_id === user.id ||
    (canReview(user) &&
      (hasPermission(user.permissions, "tasks.view_all") ||
        hasPermission(user.permissions, "tasks.view_team") ||
        task.reviewer_id === user.id));
  const manager = canManageTasks(user);
  const actions: TaskActionDefinition[] = [];

  const openAssignment =
    assignee &&
    (task.status === "todo" || task.status === "backlog") &&
    (task.assignment_state === "pending_acceptance" ||
      task.assignment_state === "clarification_requested");

  if (openAssignment) {
    actions.push(
      action({
        action: "accept",
        label: "Accept task",
        requires_comment: false,
      }),
      action({
        action: "request_clarification",
        label: "Request clarification",
        requires_comment: true,
      }),
      action({
        action: "reject_assignment",
        label: "Reject assignment",
        requires_comment: true,
      }),
    );
  }

  if (
    assignee &&
    task.assignment_state === "accepted" &&
    task.status === "todo"
  ) {
    actions.push(
      action({
        action: "start",
        label: "Start work",
        to: "in_progress",
        requires_comment: false,
      }),
    );
  }

  if (
    assignee &&
    task.assignment_state === "accepted" &&
    task.status === "in_progress"
  ) {
    actions.push(
      action({
        action: "submit_for_review",
        label: "Submit for review",
        to: "in_review",
        requires_comment: false,
      }),
    );
  }

  if (
    assignee &&
    task.assignment_state === "accepted" &&
    task.status === "changes_requested"
  ) {
    actions.push(
      action({
        action: "resume",
        label: "Resume work",
        to: "in_progress",
        requires_comment: false,
      }),
    );
  }

  if (reviewer && task.status === "in_review") {
    actions.push(
      action({
        action: "approve",
        label: "Approve",
        to: "done",
        requires_comment: false,
      }),
      action({
        action: "request_changes",
        label: "Request changes",
        to: "changes_requested",
        requires_comment: true,
      }),
    );
  }

  const blockable: TaskStatus[] = [
    "todo",
    "in_progress",
    "in_review",
    "changes_requested",
  ];
  if (
    (assignee || manager) &&
    blockable.includes(task.status) &&
    task.assignment_state !== "rejected"
  ) {
    actions.push(
      action({
        action: "block",
        label: "Mark blocked",
        to: "blocked",
        requires_comment: true,
      }),
    );
  }

  if ((assignee || manager) && task.status === "blocked") {
    actions.push(
      action({
        action: "unblock",
        label: "Unblock",
        to: task.blocked_from ?? "todo",
        requires_comment: false,
      }),
    );
  }

  if (
    manager &&
    (task.status === "todo" ||
      task.status === "blocked" ||
      task.status === "changes_requested")
  ) {
    actions.push(
      action({
        action: "move_to_backlog",
        label: "Move to backlog",
        to: "backlog",
        requires_comment: false,
      }),
    );
  }

  if (manager && task.status === "backlog") {
    actions.push(
      action({
        action: "move_to_todo",
        label: "Move to To Do",
        to: "todo",
        requires_comment: false,
      }),
    );
  }

  if (manager && task.status === "done") {
    actions.push(
      action({
        action: "reopen",
        label: "Reopen",
        to: "todo",
        requires_comment: false,
      }),
    );
  }

  const seen = new Set<TaskAction>();
  return actions.filter((item) => {
    if (seen.has(item.action)) return false;
    seen.add(item.action);
    return true;
  });
}

export function actionForTargetStatus(
  task: Task,
  user: Pick<CurrentUser, "id" | "permissions">,
  status: TaskStatus,
) {
  if (task.status === status) return null;
  return getTaskActions(task, user).find((item) => item.to === status) ?? null;
}

export class TransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransitionError";
  }
}

export function applyTaskAction(
  task: Task,
  actionName: TaskAction,
  user: Pick<CurrentUser, "id" | "permissions">,
  comment?: string,
  now = new Date().toISOString(),
): Task {
  const available = getTaskActions(task, user).find(
    (item) => item.action === actionName,
  );
  if (!available) {
    throw new TransitionError("That status change is not allowed.");
  }
  const note = comment?.trim() ?? "";
  if (available.requires_comment && note.length < 3) {
    throw new TransitionError("A comment is required for this action.");
  }

  const next: Task = { ...task, updated_at: now };

  switch (actionName) {
    case "accept":
      next.assignment_state = "accepted";
      next.clarification_note = null;
      break;
    case "request_clarification":
      next.assignment_state = "clarification_requested";
      next.clarification_note = note;
      break;
    case "reject_assignment":
      next.assignment_state = "rejected";
      next.rejection_reason = note;
      break;
    case "block":
      next.blocked_from = task.status;
      next.status = "blocked";
      next.block_reason = note;
      break;
    case "unblock":
      next.status = task.blocked_from ?? "todo";
      next.blocked_from = null;
      next.block_reason = null;
      break;
    case "reopen":
      next.status = "todo";
      next.assignment_state = "accepted";
      break;
    default:
      if (available.to) next.status = available.to;
  }

  return next;
}

export function transitionMessage(actionName: TaskAction, comment?: string) {
  const labels: Record<TaskAction, string> = {
    accept: "accepted the assignment",
    request_clarification: "requested clarification",
    reject_assignment: "rejected the assignment",
    start: "started work",
    submit_for_review: "submitted the task for review",
    approve: "approved the task",
    request_changes: "requested changes",
    resume: "resumed work",
    block: "marked the task as blocked",
    unblock: "unblocked the task",
    move_to_backlog: "moved the task to the backlog",
    move_to_todo: "moved the task to To Do",
    reopen: "reopened the task",
  };
  const note = comment?.trim();
  return note ? `${labels[actionName]}: ${note}` : labels[actionName];
}
