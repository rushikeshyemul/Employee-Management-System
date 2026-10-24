import { z } from "zod";
import { countLeaveDays } from "@/lib/leave/rules";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your work email.")
    .email("Enter a valid work email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  remember_me: z.boolean(),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your work email.")
    .email("Enter a valid work email."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "The reset link is missing a token."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string().min(1, "Confirm the new password."),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Passwords do not match.",
  });

export const taskSchema = z
  .object({
    title: z.string().trim().min(3, "Enter a title of at least 3 characters."),
    description: z.string().trim().min(1, "Add a short description."),
    project_id: z.string().min(1, "Select a project."),
    assignee_id: z.string().min(1, "Select an assignee."),
    reviewer_id: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    start_date: z.string().optional(),
    due_date: z.string().min(1, "Choose a due date."),
    labels: z.string().optional(),
    parent_id: z.string().optional(),
    status: z.enum(["backlog", "todo"]),
  })
  .refine(
    (value) => !value.start_date || value.start_date <= value.due_date,
    { path: ["due_date"], message: "Due date must be on or after the start date." },
  );

export const leaveSchema = z
  .object({
    leave_type_id: z.string().min(1, "Select a leave type."),
    start_date: z.string().min(1, "Choose a start date."),
    end_date: z.string().min(1, "Choose an end date."),
    partial_day: z.enum(["none", "am", "pm"]),
    reason: z.string().trim().min(10, "Add a reason of at least 10 characters."),
  })
  .superRefine((value, context) => {
    const result = countLeaveDays(
      value.start_date,
      value.end_date,
      value.partial_day,
    );
    if (result.error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: result.error,
      });
    }
  });

export const correctionSchema = z.object({
  date: z.string().min(1, "Choose the attendance date."),
  requested_clock_in_at: z.string().optional(),
  requested_clock_out_at: z.string().optional(),
  reason: z
    .string()
    .trim()
    .min(10, "Explain the correction in at least 10 characters."),
});

export const employeeSchema = z.object({
  first_name: z.string().trim().min(1, "Enter a first name."),
  last_name: z.string().trim().min(1, "Enter a last name."),
  email: z.string().trim().email("Enter a valid work email."),
  job_title: z.string().trim().min(2, "Enter a job title."),
  department_id: z.string().min(1, "Select a department."),
  team_id: z.string().optional(),
  manager_id: z.string().optional(),
  location: z.string().trim().min(2, "Enter a location."),
  employment_type: z.enum(["full_time", "part_time", "contract", "intern"]),
  start_date: z.string().min(1, "Choose a joining date."),
  phone: z.string().optional(),
  role: z.enum([
    "employee",
    "project_manager",
    "manager",
    "hr_admin",
    "super_admin",
  ]),
  invite: z.boolean(),
});

export const profileSchema = z.object({
  preferred_name: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().max(500, "Keep the bio under 500 characters.").optional(),
  personal_email: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .or(z.literal(""))
    .optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
});

export const decisionSchema = z
  .object({
    decision: z.enum(["approve", "reject", "request_changes"]),
    comment: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.decision !== "approve" && (value.comment?.trim().length ?? 0) < 3) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["comment"],
        message: "Add a comment explaining this decision.",
      });
    }
  });

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment before sending."),
});

export function splitLabels(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);
}
