import { describe, expect, it } from "vitest";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { TransitionError, applyTaskAction } from "@/lib/tasks/transitions";
import type { Task } from "@/types";

const task = {
  id: "task_1",
  key: "WH-1",
  title: "Ship the board",
  description: "Board",
  project_id: "prj",
  project: { id: "prj", name: "Hub" },
  department_id: "dept",
  team_id: null,
  assignee_id: "employee",
  assignee: { id: "employee", name: "Meera Iyer" },
  reporter_id: "manager",
  reporter: { id: "manager", name: "Priya Nair" },
  reviewer_id: "manager",
  reviewer: { id: "manager", name: "Priya Nair" },
  priority: "medium",
  status: "todo",
  assignment_state: "pending_acceptance",
  start_date: null,
  due_date: "2026-11-01",
  labels: [],
  parent_id: null,
  blocked_from: null,
  block_reason: null,
  rejection_reason: null,
  clarification_note: null,
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
  attachments: [],
} satisfies Task;

const employee = { id: "employee", permissions: [...ROLE_PERMISSIONS.employee] };
const manager = { id: "manager", permissions: [...ROLE_PERMISSIONS.manager] };

describe("task transitions", () => {
  it("keeps a rejected assignment instead of deleting it", () => {
    const next = applyTaskAction(task, "reject_assignment", employee, "Overlap with payroll work");
    expect(next.id).toBe(task.id);
    expect(next.assignment_state).toBe("rejected");
    expect(next.rejection_reason).toBe("Overlap with payroll work");
    expect(next.status).toBe("todo");
  });

  it("requires a comment for rejection and for review changes", () => {
    expect(() => applyTaskAction(task, "reject_assignment", employee, "no")).toThrow(TransitionError);
    const accepted = applyTaskAction(task, "accept", employee);
    const started = applyTaskAction(accepted, "start", employee);
    const review = applyTaskAction(started, "submit_for_review", employee);
    expect(() => applyTaskAction(review, "request_changes", manager, " ")).toThrow(TransitionError);
    const changed = applyTaskAction(review, "request_changes", manager, "Please add the empty state.");
    expect(changed.status).toBe("changes_requested");
  });

  it("rejects a transition the current user cannot make", () => {
    expect(() => applyTaskAction(task, "approve", employee)).toThrow(TransitionError);
  });
});
