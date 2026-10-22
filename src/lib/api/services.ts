import { apiRequest } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { parsePaginated } from "@/lib/api/pagination";
import { isDemoMode } from "@/lib/demo-mode";
import { mockApi, withDemoLatency } from "@/lib/mocks/api";
import type {
  Approval,
  ApprovalDecisionRequest,
  AttendanceCorrection,
  AttendanceCorrectionWrite,
  AttendanceRecord,
  AttendanceReport,
  AttendanceToday,
  CurrentUser,
  DashboardResponse,
  Employee,
  EmployeeWrite,
  HeadcountReport,
  InviteAcceptRequest,
  LeaveBalance,
  LeaveReport,
  LeaveRequest,
  LeaveRequestWrite,
  LeaveType,
  LoginRequest,
  LoginResponse,
  MessageResponse,
  NotificationPreferences,
  OrganisationSettings,
  Paginated,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  ProfileWrite,
  Project,
  ProjectWrite,
  ReportFilters,
  Task,
  TaskAttachment,
  TaskDetail,
  TaskReport,
  TaskTransitionRequest,
  TaskUpdate,
  TaskWrite,
  WorkflowDefinition,
  AppNotification,
  Department,
  Team,
  OnboardingCase,
  OffboardingCase,
  Asset,
  AuditEvent,
} from "@/types";

type Query = Record<string, string | number | boolean | null | undefined>;

async function fromDemo<T>(value: T) {
  return withDemoLatency(value);
}

function live<T>(path: string, options?: Parameters<typeof apiRequest>[1]) {
  return apiRequest<T>(path, options);
}

export const authService = {
  login(input: LoginRequest) {
    if (isDemoMode()) return fromDemo<LoginResponse>(mockApi.login(input));
    return live<LoginResponse>(endpoints.login, { method: "POST", body: input, skipRefresh: true });
  },
  logout() {
    if (isDemoMode()) return fromDemo<MessageResponse>(mockApi.logout());
    return live<MessageResponse>(endpoints.logout, { method: "POST", body: {} });
  },
  me() {
    if (isDemoMode()) return fromDemo<CurrentUser>(mockApi.me());
    return live<CurrentUser>(endpoints.me, { skipRefresh: true });
  },
  refresh() {
    if (isDemoMode()) return fromDemo<MessageResponse>({ detail: "Demo session does not use refresh tokens." });
    return live<MessageResponse>(endpoints.refresh, { method: "POST", body: {}, skipRefresh: true });
  },
  requestPasswordReset(input: PasswordResetRequest) {
    if (isDemoMode()) return fromDemo<MessageResponse>(mockApi.requestPasswordReset(input.email));
    return live<MessageResponse>(endpoints.passwordReset, { method: "POST", body: input, skipRefresh: true });
  },
  confirmPasswordReset(input: PasswordResetConfirmRequest) {
    if (isDemoMode()) return fromDemo<MessageResponse>(mockApi.confirmPasswordReset(input.token, input.password));
    return live<MessageResponse>(endpoints.passwordResetConfirm, { method: "POST", body: input, skipRefresh: true });
  },
  acceptInvite(input: InviteAcceptRequest) {
    if (isDemoMode()) return fromDemo<MessageResponse>(mockApi.acceptInvite(input));
    return live<MessageResponse>(endpoints.inviteAccept, { method: "POST", body: input, skipRefresh: true });
  },
};

export const employeeService = {
  list(query: Query = {}, signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<Paginated<Employee>>(mockApi.listEmployees(mockApi.me(), query));
    return live<unknown>(endpoints.employees, { query, signal }).then((payload) => parsePaginated<Employee>(payload));
  },
  get(id: string, signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo(mockApi.getEmployee(mockApi.me(), id));
    return live<Employee>(endpoints.employee(id), { signal });
  },
  create(input: EmployeeWrite) {
    if (isDemoMode()) return fromDemo(mockApi.createEmployee(mockApi.me(), input));
    return live<Employee>(endpoints.employees, { method: "POST", body: input });
  },
  update(id: string, input: Partial<EmployeeWrite>) {
    if (isDemoMode()) return fromDemo(mockApi.updateEmployee(mockApi.me(), id, input));
    return live<Employee>(endpoints.employee(id), { method: "PATCH", body: input });
  },
  updateProfile(input: ProfileWrite) {
    if (isDemoMode()) return fromDemo(mockApi.updateProfile(mockApi.me(), input));
    return live<Employee>(endpoints.employee("me"), { method: "PATCH", body: input });
  },
  people(signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo(mockApi.people());
    return live<unknown>(endpoints.employees, { query: { page_size: 200 }, signal }).then((payload) =>
      parsePaginated<Employee>(payload).results,
    );
  },
  deactivate(id: string) {
    if (isDemoMode()) return fromDemo(mockApi.deactivateEmployee(mockApi.me(), id));
    return live<Employee>(endpoints.deactivateEmployee(id), { method: "POST", body: {} });
  },
};

export const organisationService = {
  departments(signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<Department[]>(mockApi.departments());
    return live<Department[] | Paginated<Department>>(endpoints.departments, { signal }).then((payload) =>
      Array.isArray(payload) ? payload : payload.results,
    );
  },
  teams(signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<Team[]>(mockApi.teams());
    return live<Team[] | Paginated<Team>>(endpoints.teams, { signal }).then((payload) =>
      Array.isArray(payload) ? payload : payload.results,
    );
  },
  createDepartment(input: { name: string; code: string; description?: string }) {
    if (isDemoMode()) return fromDemo(mockApi.createDepartment(mockApi.me(), input));
    return live<Department>(endpoints.departments, { method: "POST", body: input });
  },
  projects(query: Query = {}, signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<Project[]>(mockApi.projects(query));
    return live<Project[] | Paginated<Project>>(endpoints.projects, { query, signal }).then((payload) =>
      Array.isArray(payload) ? payload : payload.results,
    );
  },
  project(id: string, signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo(mockApi.getProject(id));
    return live<Project>(endpoints.project(id), { signal });
  },
  saveProject(input: ProjectWrite, id?: string) {
    if (isDemoMode()) return fromDemo(mockApi.saveProject(mockApi.me(), input, id));
    return id
      ? live<Project>(endpoints.project(id), { method: "PATCH", body: input })
      : live<Project>(endpoints.projects, { method: "POST", body: input });
  },
  settings(signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo(mockApi.settings());
    return live<OrganisationSettings>(endpoints.organisation, { signal });
  },
  updateSettings(input: Partial<OrganisationSettings>) {
    if (isDemoMode()) return fromDemo(mockApi.updateSettings(mockApi.me(), input));
    return live<OrganisationSettings>(endpoints.organisation, { method: "PATCH", body: input });
  },
};

export const taskService = {
  list(query: Query = {}, signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<Paginated<Task>>(mockApi.listTasks(query));
    return live<unknown>(endpoints.tasks, { query, signal }).then((payload) => parsePaginated<Task>(payload));
  },
  get(id: string, signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<TaskDetail>(mockApi.getTask(id));
    return live<TaskDetail>(endpoints.task(id), { signal });
  },
  create(input: TaskWrite) {
    if (isDemoMode()) return fromDemo(mockApi.createTask(input));
    return live<Task>(endpoints.tasks, { method: "POST", body: input });
  },
  update(id: string, input: TaskUpdate) {
    if (isDemoMode()) return fromDemo(mockApi.updateTask(id, input));
    return live<Task>(endpoints.task(id), { method: "PATCH", body: input });
  },
  transition(id: string, input: TaskTransitionRequest) {
    if (isDemoMode()) return fromDemo(mockApi.transitionTask(id, input.action, input.comment));
    return live<TaskDetail>(endpoints.taskTransitions(id), { method: "POST", body: input });
  },
  addComment(id: string, body: string) {
    if (isDemoMode()) return fromDemo(mockApi.addComment(id, body));
    return live<TaskDetail>(endpoints.taskComments(id), { method: "POST", body: { body } });
  },
  addAttachment(id: string, file: File) {
    if (isDemoMode()) {
      return fromDemo(mockApi.addAttachment(id, { name: file.name, size: file.size, type: file.type }));
    }
    const formData = new FormData();
    formData.set("file", file);
    return live<TaskAttachment>(endpoints.taskAttachments(id), { method: "POST", formData });
  },
  workflow(signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<WorkflowDefinition>(mockApi.workflow());
    return live<WorkflowDefinition>(endpoints.workflow, { signal });
  },
};

export const attendanceService = {
  today(signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<AttendanceToday>(mockApi.attendanceToday());
    return live<AttendanceToday>(endpoints.attendanceMe, { signal });
  },
  records(query: Query = {}, signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<Paginated<AttendanceRecord>>(mockApi.attendanceRecords(query));
    return live<unknown>(endpoints.attendanceRecords, { query, signal }).then((payload) => parsePaginated<AttendanceRecord>(payload));
  },
  clockIn() {
    if (isDemoMode()) return fromDemo(mockApi.clockIn());
    return live<AttendanceToday>(endpoints.clockIn, { method: "POST", body: {} });
  },
  clockOut() {
    if (isDemoMode()) return fromDemo(mockApi.clockOut());
    return live<AttendanceToday>(endpoints.clockOut, { method: "POST", body: {} });
  },
  startBreak() {
    if (isDemoMode()) return fromDemo(mockApi.startBreak());
    return live<AttendanceToday>(endpoints.breakStart, { method: "POST", body: {} });
  },
  endBreak() {
    if (isDemoMode()) return fromDemo(mockApi.endBreak());
    return live<AttendanceToday>(endpoints.breakEnd, { method: "POST", body: {} });
  },
  corrections(query: Query = {}, signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<Paginated<AttendanceCorrection>>(mockApi.corrections(query));
    return live<unknown>(endpoints.corrections, { query, signal }).then((payload) => parsePaginated<AttendanceCorrection>(payload));
  },
  createCorrection(input: AttendanceCorrectionWrite) {
    if (isDemoMode()) return fromDemo(mockApi.createCorrection(input));
    return live<AttendanceCorrection>(endpoints.corrections, { method: "POST", body: input });
  },
};

export const leaveService = {
  types(signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<LeaveType[]>(mockApi.leaveTypes());
    return live<LeaveType[] | Paginated<LeaveType>>(endpoints.leaveTypes, { signal }).then((payload) =>
      Array.isArray(payload) ? payload : payload.results,
    );
  },
  balances(employeeId?: string, signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<LeaveBalance[]>(mockApi.leaveBalances(employeeId));
    const path = employeeId ? endpoints.leaveBalancesFor(employeeId) : endpoints.leaveBalances;
    return live<LeaveBalance[]>(path, { signal });
  },
  list(query: Query = {}, signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<Paginated<LeaveRequest>>(mockApi.leaveRequests(query));
    return live<unknown>(endpoints.leaveRequests, { query, signal }).then((payload) => parsePaginated<LeaveRequest>(payload));
  },
  get(id: string, signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo(mockApi.getLeave(id));
    return live<LeaveRequest>(endpoints.leaveRequest(id), { signal });
  },
  create(input: LeaveRequestWrite) {
    if (isDemoMode()) return fromDemo(mockApi.createLeave(input));
    return live<LeaveRequest>(endpoints.leaveRequests, { method: "POST", body: input });
  },
  withdraw(id: string) {
    if (isDemoMode()) return fromDemo(mockApi.withdrawLeave(id));
    return live<LeaveRequest>(endpoints.withdrawLeave(id), { method: "POST", body: {} });
  },
  cancel(id: string) {
    if (isDemoMode()) return fromDemo(mockApi.cancelLeave(id));
    return live<LeaveRequest>(endpoints.cancelLeave(id), { method: "POST", body: {} });
  },
};

export const approvalService = {
  list(query: Query = {}, signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<Paginated<Approval>>(mockApi.approvals(query));
    return live<unknown>(endpoints.approvals, { query, signal }).then((payload) => parsePaginated<Approval>(payload));
  },
  get(id: string, signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo(mockApi.getApproval(id));
    return live<Approval>(endpoints.approval(id), { signal });
  },
  decide(id: string, input: ApprovalDecisionRequest) {
    if (isDemoMode()) return fromDemo(mockApi.decideApproval(id, input));
    return live<Approval>(endpoints.approvalDecision(id), { method: "POST", body: input });
  },
};

export const notificationService = {
  list(query: Query = {}, signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<Paginated<AppNotification>>(mockApi.notifications(query));
    return live<unknown>(endpoints.notifications, { query, signal }).then((payload) => parsePaginated<AppNotification>(payload));
  },
  unreadCount(signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo(mockApi.unreadCount());
    return live<{ count: number } | number>(endpoints.notifications, { query: { unread: 1, page_size: 1 }, signal }).then((payload) =>
      typeof payload === "number" ? payload : "count" in payload ? payload.count : 0,
    );
  },
  markRead(id: string) {
    if (isDemoMode()) return fromDemo(mockApi.markRead(id));
    return live<AppNotification>(endpoints.notificationRead(id), { method: "POST", body: {} });
  },
  markAllRead() {
    if (isDemoMode()) return fromDemo(mockApi.markAllRead());
    return live<MessageResponse>(endpoints.notificationsReadAll, { method: "POST", body: {} });
  },
  preferences(signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo(mockApi.preferences());
    return live<NotificationPreferences>(endpoints.notificationPreferences, { signal });
  },
  updatePreferences(input: NotificationPreferences) {
    if (isDemoMode()) return fromDemo(mockApi.updatePreferences(input));
    return live<NotificationPreferences>(endpoints.notificationPreferences, { method: "PATCH", body: input });
  },
};

export const reportService = {
  dashboard(query: Query = {}, signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<DashboardResponse>(mockApi.dashboard(query));
    return live<DashboardResponse>(endpoints.dashboard, { query, signal });
  },
  tasks(query: ReportFilters = {}, signal?: AbortSignal) {
    const params = query as Query;
    if (isDemoMode()) return fromDemo<TaskReport>(mockApi.taskReport(params));
    return live<TaskReport>(endpoints.taskReport, { query: params, signal });
  },
  attendance(query: ReportFilters = {}, signal?: AbortSignal) {
    const params = query as Query;
    if (isDemoMode()) return fromDemo<AttendanceReport>(mockApi.attendanceReport(params));
    return live<AttendanceReport>(endpoints.attendanceReport, { query: params, signal });
  },
  leave(query: ReportFilters = {}, signal?: AbortSignal) {
    const params = query as Query;
    if (isDemoMode()) return fromDemo<LeaveReport>(mockApi.leaveReport(params));
    return live<LeaveReport>(endpoints.leaveReport, { query: params, signal });
  },
  headcount(query: ReportFilters = {}, signal?: AbortSignal) {
    const params = query as Query;
    if (isDemoMode()) return fromDemo<HeadcountReport>(mockApi.headcountReport(params));
    return live<HeadcountReport>(endpoints.headcountReport, { query: params, signal });
  },
};

export const searchService = {
  search(query: string) {
    if (isDemoMode()) return fromDemo(mockApi.search(query));
    return live<{ tasks: Task[]; employees: Employee[]; projects: Project[] }>(endpoints.search, { query: { q: query } });
  },
};

export const lifecycleService = {
  onboarding(signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<OnboardingCase[]>(mockApi.onboarding());
    return live<OnboardingCase[]>(endpoints.onboarding, { signal });
  },
  toggleOnboarding(caseId: string, itemId: string) {
    if (isDemoMode()) return fromDemo(mockApi.toggleOnboarding(caseId, itemId));
    return live<OnboardingCase>(`${endpoints.onboarding}${caseId}/items/${itemId}/`, { method: "POST", body: {} });
  },
  offboarding(signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<OffboardingCase[]>(mockApi.offboarding());
    return live<OffboardingCase[]>(endpoints.offboarding, { signal });
  },
  assets(signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<Asset[]>(mockApi.assets());
    return live<Asset[]>(endpoints.assets, { signal });
  },
  audit(query: Query = {}, signal?: AbortSignal) {
    if (isDemoMode()) return fromDemo<Paginated<AuditEvent>>(mockApi.audit(query));
    return live<unknown>(endpoints.audit, { query, signal }).then((payload) => parsePaginated<AuditEvent>(payload));
  },
};
