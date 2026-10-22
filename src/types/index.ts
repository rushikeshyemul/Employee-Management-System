export const ROLES = [
  "super_admin",
  "hr_admin",
  "manager",
  "project_manager",
  "employee",
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "dashboard.view",
  "tasks.view_own",
  "tasks.view_team",
  "tasks.view_all",
  "tasks.create",
  "tasks.assign",
  "tasks.review",
  "tasks.comment",
  "tasks.transition_own",
  "projects.view",
  "projects.manage",
  "attendance.view_own",
  "attendance.clock",
  "attendance.request_correction",
  "attendance.view_team",
  "attendance.manage",
  "leave.view_own",
  "leave.request",
  "leave.view_team",
  "leave.approve",
  "leave.manage",
  "approvals.view",
  "approvals.decide",
  "notifications.view",
  "profile.view",
  "profile.edit_self",
  "employees.view_team",
  "employees.view",
  "employees.manage",
  "employees.deactivate",
  "employees.view_sensitive",
  "reports.view_team",
  "reports.view_org",
  "departments.view",
  "departments.manage",
  "onboarding.view",
  "settings.view",
  "settings.manage",
  "audit.view",
  "roles.view",
  "roles.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PersonRef {
  id: string;
  name: string;
  job_title?: string;
  avatar_url?: string | null;
}

export interface CurrentUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  preferred_name?: string | null;
  role: Role;
  permissions: Permission[];
  employee_id: string;
  job_title: string;
  department_id: string;
  team_id: string | null;
  manager_id: string | null;
  timezone: string;
  avatar_url?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  user: CurrentUser;
  /** Present only for the bearer strategy. Never persist this value. */
  access?: string;
  /** Present only when the backend returns a refresh token in the body. Hold in memory only. */
  refresh?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  password: string;
}

export interface MessageResponse {
  detail: string;
}

export type EmploymentStatus =
  | "active"
  | "invited"
  | "on_leave"
  | "inactive"
  | "offboarding";

export type EmploymentType = "full_time" | "part_time" | "contract" | "intern";

export interface Department {
  id: string;
  name: string;
  code: string;
  head_id: string | null;
  description: string;
}

export interface Team {
  id: string;
  name: string;
  department_id: string;
  lead_id: string | null;
  description: string;
}

export interface Employee {
  id: string;
  user_id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  preferred_name?: string | null;
  email: string;
  personal_email?: string | null;
  phone?: string | null;
  job_title: string;
  department_id: string;
  team_id: string | null;
  manager_id: string | null;
  location: string;
  employment_type: EmploymentType;
  status: EmploymentStatus;
  start_date: string;
  end_date?: string | null;
  avatar_url?: string | null;
  bio?: string;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  /** Returned only when the caller has employees.view_sensitive. */
  salary_band?: string | null;
  date_of_birth?: string | null;
}

export interface EmployeeWrite {
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  department_id: string;
  team_id?: string | null;
  manager_id?: string | null;
  location: string;
  employment_type: EmploymentType;
  start_date: string;
  phone?: string | null;
  role: Role;
  invite?: boolean;
}

export interface ProfileWrite {
  preferred_name?: string | null;
  phone?: string | null;
  bio?: string;
  personal_email?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  description: string;
  department_id: string;
  lead_id: string | null;
  status: "planned" | "active" | "on_hold" | "completed";
  start_date: string | null;
  target_date: string | null;
}

export interface ProjectWrite {
  name: string;
  key: string;
  description: string;
  department_id: string;
  lead_id?: string | null;
  status: Project["status"];
  start_date?: string | null;
  target_date?: string | null;
}

export const TASK_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "changes_requested",
  "done",
  "blocked",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const ASSIGNMENT_STATES = [
  "pending_acceptance",
  "accepted",
  "clarification_requested",
  "rejected",
] as const;

export type AssignmentState = (typeof ASSIGNMENT_STATES)[number];

export const TASK_ACTIONS = [
  "accept",
  "request_clarification",
  "reject_assignment",
  "start",
  "submit_for_review",
  "approve",
  "request_changes",
  "resume",
  "block",
  "unblock",
  "move_to_backlog",
  "move_to_todo",
  "reopen",
] as const;

export type TaskAction = (typeof TASK_ACTIONS)[number];

export interface TaskAttachment {
  id: string;
  name: string;
  size: number;
  content_type: string;
  url: string | null;
}

export interface Task {
  id: string;
  key: string;
  title: string;
  description: string;
  project_id: string;
  project: PersonRef & { key?: string };
  department_id: string;
  team_id: string | null;
  assignee_id: string | null;
  assignee: PersonRef | null;
  reporter_id: string;
  reporter: PersonRef;
  reviewer_id: string | null;
  reviewer: PersonRef | null;
  priority: TaskPriority;
  status: TaskStatus;
  assignment_state: AssignmentState;
  rejection_reason: string | null;
  clarification_note: string | null;
  block_reason: string | null;
  blocked_from: TaskStatus | null;
  start_date: string | null;
  due_date: string | null;
  labels: string[];
  parent_id: string | null;
  attachments: TaskAttachment[];
  created_at: string;
  updated_at: string;
}

export interface TaskWrite {
  title: string;
  description: string;
  project_id: string;
  assignee_id: string;
  reviewer_id?: string | null;
  priority: TaskPriority;
  start_date?: string | null;
  due_date?: string | null;
  labels: string[];
  parent_id?: string | null;
  status?: Extract<TaskStatus, "backlog" | "todo">;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  project_id?: string;
  assignee_id?: string | null;
  reviewer_id?: string | null;
  priority?: TaskPriority;
  start_date?: string | null;
  due_date?: string | null;
  labels?: string[];
  parent_id?: string | null;
}

export interface TaskTransitionRequest {
  action: TaskAction;
  comment?: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  author: PersonRef;
  body: string;
  created_at: string;
}

export interface TaskEvent {
  id: string;
  task_id: string;
  actor_id: string;
  actor: PersonRef;
  message: string;
  created_at: string;
}

export interface TaskDetail extends Task {
  comments: TaskComment[];
  events: TaskEvent[];
  subtasks: Task[];
  available_actions: TaskActionDefinition[];
}

export interface TaskActionDefinition {
  action: TaskAction;
  label: string;
  to?: TaskStatus;
  requires_comment: boolean;
}

export interface WorkflowDefinition {
  statuses: { id: TaskStatus; label: string; description: string }[];
  actions: TaskActionDefinition[];
  note: string;
}

export type AttendanceDayStatus =
  | "not_started"
  | "clocked_in"
  | "on_break"
  | "clocked_out";

export interface AttendanceToday {
  date: string;
  status: AttendanceDayStatus;
  clock_in_at: string | null;
  clock_out_at: string | null;
  break_started_at: string | null;
  break_minutes: number;
  worked_minutes: number;
  timezone: string;
  is_late: boolean;
  missing_clock_out: boolean;
  breaks_enabled: boolean;
  standard_start: string;
}

export type AttendanceRecordStatus =
  | "present"
  | "late"
  | "absent"
  | "partial"
  | "leave"
  | "holiday";

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee: PersonRef;
  department_id: string;
  date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  break_minutes: number;
  worked_minutes: number;
  status: AttendanceRecordStatus;
  exceptions: string[];
  timezone: string;
}

export interface AttendanceCorrection {
  id: string;
  employee_id: string;
  employee: PersonRef;
  date: string;
  requested_clock_in_at: string | null;
  requested_clock_out_at: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewer_comment: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface AttendanceCorrectionWrite {
  date: string;
  requested_clock_in_at?: string | null;
  requested_clock_out_at?: string | null;
  reason: string;
}

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  description: string;
  requires_attachment: boolean;
  allow_partial_day: boolean;
}

export interface LeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  code: string;
  allocated_days: number;
  used_days: number;
  pending_days: number;
  available_days: number;
}

export type LeaveRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "cancelled";

export type PartialDay = "none" | "am" | "pm";

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee: PersonRef;
  department_id: string;
  leave_type_id: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  partial_day: PartialDay;
  days: number;
  reason: string;
  status: LeaveRequestStatus;
  reviewer_comment: string | null;
  created_at: string;
  decided_at: string | null;
  warnings: string[];
}

export interface LeaveRequestWrite {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  partial_day: PartialDay;
  reason: string;
}

export type ApprovalType =
  | "leave"
  | "attendance_correction"
  | "hr_request"
  | "profile_change";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested";

export type ApprovalDecision = "approve" | "reject" | "request_changes";

export interface Approval {
  id: string;
  type: ApprovalType;
  subject_id: string;
  employee_id: string;
  employee: PersonRef;
  title: string;
  summary: string;
  status: ApprovalStatus;
  submitted_at: string;
  decided_at: string | null;
  decided_by: string | null;
  comment: string | null;
  context: { label: string; value: string }[];
  history: { at: string; actor: string; message: string }[];
}

export interface ApprovalDecisionRequest {
  decision: ApprovalDecision;
  comment?: string;
}

export type NotificationCategory =
  | "task"
  | "leave"
  | "attendance"
  | "approval"
  | "hr"
  | "system";

export interface AppNotification {
  id: string;
  recipient_id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  in_app_enabled: boolean;
  categories: Record<NotificationCategory, boolean>;
}

export interface ActivityItem {
  id: string;
  actor_name: string;
  message: string;
  created_at: string;
  href: string | null;
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}

export interface WorkloadItem {
  employee_id: string;
  name: string;
  open_tasks: number;
  overdue: number;
}

export interface DashboardResponse {
  generated_at: string;
  scope: "self" | "team" | "organisation";
  range: { from: string; to: string };
  filters: { department_id: string | null };
  greeting_name: string;
  metrics: DashboardMetric[];
  attendance_today: AttendanceToday | null;
  task_summary: { status: TaskStatus; count: number }[];
  upcoming_deadlines: Task[];
  overdue_tasks: Task[];
  leave_balances: LeaveBalance[];
  pending_requests: LeaveRequest[];
  notifications: AppNotification[];
  activity: ActivityItem[];
  team: {
    member_count: number;
    awaiting_review: number;
    pending_approvals: number;
    attendance_exceptions: AttendanceRecord[];
    upcoming_leave: LeaveRequest[];
    workload: WorkloadItem[];
  } | null;
  organisation: {
    total_employees: number;
    active_employees: number;
    departments: { id: string; name: string; count: number }[];
    attendance_summary: {
      present: number;
      late: number;
      absent: number;
      on_leave: number;
    };
    pending_leave: number;
    pending_hr: number;
    joiners: Employee[];
    exits: Employee[];
    audit: AuditEvent[];
  } | null;
}

export interface ReportFilters {
  from?: string;
  to?: string;
  department_id?: string;
}

export interface TaskReport {
  range: { from: string; to: string };
  department_id: string | null;
  by_status: { status: TaskStatus; count: number }[];
  by_priority: { priority: TaskPriority; count: number }[];
  overdue: Task[];
  workload: WorkloadItem[];
  completed_in_range: number;
  open_tasks: number;
}

export interface AttendanceReport {
  range: { from: string; to: string };
  department_id: string | null;
  summary: { present: number; late: number; absent: number; partial: number };
  by_day: { date: string; present: number; late: number; absent: number }[];
  exceptions: AttendanceRecord[];
}

export interface LeaveReport {
  range: { from: string; to: string };
  department_id: string | null;
  by_type: {
    leave_type_name: string;
    allocated_days: number;
    used_days: number;
    pending_days: number;
  }[];
  requests: LeaveRequest[];
}

export interface HeadcountReport {
  range: { from: string; to: string };
  department_id: string | null;
  total: number;
  active: number;
  by_department: { name: string; count: number }[];
  by_type: { employment_type: EmploymentType; count: number }[];
  joiners: Employee[];
  exits: Employee[];
}

export interface AuditEvent {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  target: string;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  owner: string;
}

export interface OnboardingCase {
  id: string;
  employee_id: string;
  employee: PersonRef;
  start_date: string;
  status: "not_started" | "in_progress" | "completed";
  items: ChecklistItem[];
}

export interface OffboardingCase {
  id: string;
  employee_id: string;
  employee: PersonRef;
  last_day: string;
  status: "in_progress" | "completed";
  items: ChecklistItem[];
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  serial_number: string;
  assigned_to: string | null;
  assignee: PersonRef | null;
  status: "available" | "assigned" | "retired";
}

export interface OrganisationSettings {
  name: string;
  legal_name: string;
  timezone: string;
  work_week: number[];
  standard_start: string;
  breaks_enabled: boolean;
  date_format: string;
}

export interface InviteAcceptRequest {
  token: string;
  password: string;
  preferred_name?: string;
}
