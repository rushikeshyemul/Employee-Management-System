import { ApiError } from "@/lib/api/errors";
import { paginate } from "@/lib/api/pagination";
import { workedMinutesFromStamps } from "@/lib/attendance/rules";
import {
  compareDate,
  dateTimeInTimeZone,
  personName,
  rangesOverlap,
  shiftDate,
  todayInTimeZone,
} from "@/lib/format";
import { countLeaveDays } from "@/lib/leave/rules";
import { hasPermission } from "@/lib/permissions";
import { DEMO_PASSWORD, userFrom, type Database } from "@/lib/mocks/seed";
import {
  clearSession,
  getDb,
  nextSequence,
  readSessionUserId,
  resetDb,
  saveDb,
  writeSession,
} from "@/lib/mocks/store";
import {
  applyTaskAction,
  getTaskActions,
  TASK_STATUS_META,
  transitionMessage,
  TransitionError,
} from "@/lib/tasks/transitions";
import type {
  Approval,
  ApprovalDecisionRequest,
  AttendanceCorrection,
  AttendanceCorrectionWrite,
  AttendanceRecord,
  AttendanceToday,
  CurrentUser,
  DashboardResponse,
  Employee,
  EmployeeWrite,
  InviteAcceptRequest,
  LeaveBalance,
  LeaveRequest,
  LeaveRequestWrite,
  LoginRequest,
  NotificationPreferences,
  OrganisationSettings,
  PersonRef,
  ProfileWrite,
  Project,
  ProjectWrite,
  Task,
  TaskAttachment,
  TaskUpdate,
  TaskWrite,
  TaskAction,
} from "@/types";

type Params = Record<string, string | number | boolean | null | undefined>;

function db() {
  return getDb();
}

function requireUser(): CurrentUser {
  const userId = readSessionUserId();
  if (!userId) throw new ApiError(401, "Sign in to continue.");
  const account = db().accounts.find((item) => item.userId === userId);
  const employee = db().employees.find((item) => item.id === userId);
  if (!account || !employee) throw new ApiError(401, "Sign in to continue.");
  if (employee.status === "inactive") {
    throw new ApiError(403, "This account is inactive.");
  }
  return userFrom(employee, account.role);
}

function assertPermission(user: CurrentUser, permission: Parameters<typeof hasPermission>[1]) {
  if (!hasPermission(user.permissions, permission)) {
    throw new ApiError(403, "You do not have permission to do that.");
  }
}

function personRef(id: string | null): PersonRef | null {
  if (!id) return null;
  const employee = db().employees.find((item) => item.id === id);
  if (!employee) return null;
  return {
    id: employee.id,
    name: personName(employee),
    job_title: employee.job_title,
    avatar_url: employee.avatar_url ?? null,
  };
}

function mustPerson(id: string): PersonRef {
  const person = personRef(id);
  if (!person) throw new ApiError(404, "Employee was not found.");
  return person;
}

function hydrateTask(task: Task): Task {
  const project = db().projects.find((item) => item.id === task.project_id);
  return {
    ...task,
    project: project
      ? { id: project.id, name: project.name, key: project.key }
      : task.project,
    assignee: personRef(task.assignee_id),
    reporter: personRef(task.reporter_id) ?? task.reporter,
    reviewer: personRef(task.reviewer_id),
  };
}

function visibleEmployees(user: CurrentUser) {
  if (hasPermission(user.permissions, "employees.view")) return db().employees;
  if (hasPermission(user.permissions, "employees.view_team")) {
    return db().employees.filter(
      (employee) =>
        employee.id === user.id ||
        employee.manager_id === user.id ||
        (user.team_id !== null && employee.team_id === user.team_id),
    );
  }
  return db().employees.filter((employee) => employee.id === user.id);
}

function presentEmployee(employee: Employee, user: CurrentUser): Employee {
  const sensitive = hasPermission(user.permissions, "employees.view_sensitive");
  const self = employee.id === user.id;
  const directory =
    sensitive ||
    self ||
    hasPermission(user.permissions, "employees.view") ||
    hasPermission(user.permissions, "employees.view_team");
  return {
    ...employee,
    phone: directory ? employee.phone : null,
    personal_email: self || sensitive ? employee.personal_email : null,
    emergency_contact_name: self || sensitive ? employee.emergency_contact_name : null,
    emergency_contact_phone: self || sensitive ? employee.emergency_contact_phone : null,
    salary_band: sensitive ? employee.salary_band : undefined,
    date_of_birth: sensitive ? employee.date_of_birth : undefined,
  };
}

function visibleTasks(user: CurrentUser) {
  const tasks = db().tasks.map(hydrateTask);
  if (hasPermission(user.permissions, "tasks.view_all")) return tasks;
  const team = new Set(visibleEmployees(user).map((employee) => employee.id));
  if (hasPermission(user.permissions, "tasks.view_team")) {
    return tasks.filter(
      (task) =>
        (task.assignee_id && team.has(task.assignee_id)) ||
        task.reporter_id === user.id ||
        task.reviewer_id === user.id,
    );
  }
  return tasks.filter(
    (task) =>
      task.assignee_id === user.id ||
      task.reporter_id === user.id ||
      task.reviewer_id === user.id,
  );
}

function pageOf<T>(items: T[], params: Params = {}) {
  return paginate(items, Number(params.page ?? 1) || 1, Number(params.page_size ?? 20) || 20);
}

function includes(value: string | null | undefined, search: string) {
  return (value ?? "").toLowerCase().includes(search);
}

function notify(
  recipientId: string,
  category: Database["notifications"][number]["category"],
  title: string,
  body: string,
  href: string | null,
) {
  db().notifications.unshift({
    id: nextSequence("nt"),
    recipient_id: recipientId,
    category,
    title,
    body,
    href,
    read_at: null,
    created_at: new Date().toISOString(),
  });
}

function audit(user: CurrentUser, action: string, target: string) {
  db().audit.unshift({
    id: nextSequence("aud"),
    actor_id: user.id,
    actor_name: personName(user),
    action,
    target,
    created_at: new Date().toISOString(),
  });
}

function addEvent(taskId: string, actorId: string, message: string) {
  db().events.unshift({
    id: nextSequence("evt"),
    task_id: taskId,
    actor_id: actorId,
    actor: mustPerson(actorId),
    message,
    created_at: new Date().toISOString(),
  });
}

function findTask(id: string, user: CurrentUser) {
  const task = visibleTasks(user).find((item) => item.id === id || item.key === id);
  if (!task) throw new ApiError(404, "Task was not found.");
  return task;
}

function leaveBalances(employeeId: string): LeaveBalance[] {
  return db().leaveTypes.map((type) => {
    const allocated =
      db().allocations.find(
        (item) => item.employee_id === employeeId && item.leave_type_id === type.id,
      )?.allocated_days ?? 0;
    const requests = db().leaveRequests.filter(
      (item) => item.employee_id === employeeId && item.leave_type_id === type.id,
    );
    const used = requests
      .filter((item) => item.status === "approved")
      .reduce((sum, item) => sum + item.days, 0);
    const pending = requests
      .filter((item) => item.status === "pending")
      .reduce((sum, item) => sum + item.days, 0);
    return {
      leave_type_id: type.id,
      leave_type_name: type.name,
      code: type.code,
      allocated_days: allocated,
      used_days: used,
      pending_days: pending,
      available_days: Math.max(0, allocated - used - pending),
    };
  });
}

function refreshAttendance(record: AttendanceRecord, now = new Date()) {
  const openBreak = db().breaks.find((item) => item.employee_id === record.employee_id);
  let breakMinutes = record.break_minutes;
  if (openBreak) {
    breakMinutes += Math.round((now.getTime() - new Date(openBreak.started_at).getTime()) / 60000);
  }
  record.worked_minutes = workedMinutesFromStamps(
    record.clock_in_at,
    record.clock_out_at,
    record.break_minutes,
    now,
  );
  if (openBreak) {
    record.worked_minutes = workedMinutesFromStamps(
      record.clock_in_at,
      record.clock_out_at,
      breakMinutes,
      now,
    );
  }
  return record;
}

function todayState(user: CurrentUser): AttendanceToday {
  const timezone = db().organisation.timezone;
  const date = todayInTimeZone(timezone);
  const record = db().attendance.find(
    (item) => item.employee_id === user.id && item.date === date && item.status !== "leave" && item.status !== "holiday",
  );
  const openBreak = db().breaks.find((item) => item.employee_id === user.id);
  if (record) refreshAttendance(record);
  let status: AttendanceToday["status"] = "not_started";
  if (record?.clock_out_at) status = "clocked_out";
  else if (record?.clock_in_at && openBreak) status = "on_break";
  else if (record?.clock_in_at) status = "clocked_in";
  const missing = db().attendance.some(
    (item) =>
      item.employee_id === user.id &&
      item.date < date &&
      item.clock_in_at &&
      !item.clock_out_at,
  );
  return {
    date,
    status,
    clock_in_at: record?.clock_in_at ?? null,
    clock_out_at: record?.clock_out_at ?? null,
    break_started_at: openBreak?.started_at ?? null,
    break_minutes: record?.break_minutes ?? 0,
    worked_minutes: record?.worked_minutes ?? 0,
    timezone,
    is_late: record?.status === "late" || record?.exceptions.includes("Late arrival") === true,
    missing_clock_out: missing,
    breaks_enabled: db().organisation.breaks_enabled,
    standard_start: db().organisation.standard_start,
  };
}

function canSeeApproval(user: CurrentUser, approval: Approval) {
  if (
    hasPermission(user.permissions, "leave.manage") ||
    hasPermission(user.permissions, "attendance.manage") ||
    hasPermission(user.permissions, "reports.view_org")
  ) {
    return true;
  }
  const employee = db().employees.find((item) => item.id === approval.employee_id);
  return employee?.manager_id === user.id;
}

export const mockApi = {
  reset: resetDb,

  login(input: LoginRequest) {
    const account = db().accounts.find(
      (item) => item.email.toLowerCase() === input.email.trim().toLowerCase(),
    );
    if (!account || account.password !== input.password) {
      throw new ApiError(400, "The email or password is incorrect.", {
        non_field_errors: ["The email or password is incorrect."],
      });
    }
    const employee = db().employees.find((item) => item.id === account.userId);
    if (!employee || employee.status === "inactive") {
      throw new ApiError(403, "This account is inactive.");
    }
    writeSession(account.userId, Boolean(input.remember_me));
    return { user: userFrom(employee, account.role) };
  },

  logout() {
    clearSession();
    return { detail: "Signed out." };
  },

  me() {
    return requireUser();
  },

  requestPasswordReset(email: string) {
    const exists = db().accounts.some(
      (item) => item.email.toLowerCase() === email.trim().toLowerCase(),
    );
    return {
      detail: exists
        ? "If an account exists for that email, reset instructions have been sent."
        : "If an account exists for that email, reset instructions have been sent.",
    };
  },

  confirmPasswordReset(token: string, password: string) {
    if (token !== "demo-reset") throw new ApiError(400, "This reset link is invalid.");
    if (password.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters.", {
        password: ["Password must be at least 8 characters."],
      });
    }
    const account = db().accounts.find((item) => item.email === "employee@helios.example");
    if (!account) throw new ApiError(400, "This reset link is invalid.");
    account.password = password;
    saveDb();
    return { detail: "Password updated for the demo employee account. You can sign in with the new password." };
  },

  acceptInvite(input: InviteAcceptRequest) {
    if (input.token !== "demo-invite-grace") {
      throw new ApiError(400, "This invitation link is invalid or has expired.");
    }
    const employee = db().employees.find((item) => item.id === "emp_grace");
    if (!employee) throw new ApiError(404, "Invitation was not found.");
    employee.status = "active";
    if (input.preferred_name) employee.preferred_name = input.preferred_name;
    const account = db().accounts.find((item) => item.userId === employee.id);
    if (account) account.password = input.password;
    saveDb();
    return { detail: "Invitation accepted. You can sign in." };
  },

  people() {
    const user = requireUser();
    const source =
      hasPermission(user.permissions, "tasks.view_all") ||
      hasPermission(user.permissions, "employees.view")
        ? db().employees
        : visibleEmployees(user);
    return source
      .filter((employee) => employee.status !== "inactive")
      .map((employee) => presentEmployee(employee, user));
  },

  listEmployees(user: CurrentUser, params: Params = {}) {
    const search = String(params.search ?? "").trim().toLowerCase();
    let items = visibleEmployees(user).map((employee) => presentEmployee(employee, user));
    if (search) {
      items = items.filter((employee) =>
        [employee.first_name, employee.last_name, employee.email, employee.employee_code, employee.job_title, employee.location]
          .some((value) => includes(value, search)),
      );
    }
    if (params.department) items = items.filter((employee) => employee.department_id === params.department);
    if (params.manager) items = items.filter((employee) => employee.manager_id === params.manager);
    if (params.location) items = items.filter((employee) => employee.location === params.location);
    if (params.employment_type) items = items.filter((employee) => employee.employment_type === params.employment_type);
    if (params.status) items = items.filter((employee) => employee.status === params.status);
    if (params.team) items = items.filter((employee) => employee.team_id === params.team);
    const ordering = String(params.ordering ?? "name");
    items.sort((left, right) => {
      const name = personName(left).localeCompare(personName(right));
      if (ordering === "-name") return -name;
      if (ordering === "start_date") return left.start_date.localeCompare(right.start_date);
      if (ordering === "-start_date") return right.start_date.localeCompare(left.start_date);
      return name;
    });
    return pageOf(items, params);
  },

  getEmployee(user: CurrentUser, id: string) {
    const employee = visibleEmployees(user).find((item) => item.id === id);
    if (!employee) throw new ApiError(404, "Employee was not found.");
    return presentEmployee(employee, user);
  },

  createEmployee(user: CurrentUser, input: EmployeeWrite) {
    assertPermission(user, "employees.manage");
    if (db().employees.some((item) => item.email.toLowerCase() === input.email.toLowerCase())) {
      throw new ApiError(400, "An employee with this email already exists.", {
        email: ["An employee with this email already exists."],
      });
    }
    const id = nextSequence("emp");
    const employee: Employee = {
      id,
      user_id: id,
      employee_code: `HX-${1600 + db().employees.length}`,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      phone: input.phone ?? null,
      job_title: input.job_title,
      department_id: input.department_id,
      team_id: input.team_id ?? null,
      manager_id: input.manager_id ?? null,
      location: input.location,
      employment_type: input.employment_type,
      status: input.invite ? "invited" : "active",
      start_date: input.start_date,
      bio: "",
      salary_band: null,
      date_of_birth: null,
    };
    db().employees.push(employee);
    db().accounts.push({
      email: input.email,
      password: DEMO_PASSWORD,
      userId: id,
      role: input.role,
    });
    for (const type of db().leaveTypes) {
      const sample = db().allocations.find((item) => item.leave_type_id === type.id);
      db().allocations.push({
        employee_id: id,
        leave_type_id: type.id,
        allocated_days: sample?.allocated_days ?? 0,
      });
    }
    audit(user, input.invite ? "Invited employee" : "Created employee", personName(employee));
    saveDb();
    return presentEmployee(employee, user);
  },

  updateEmployee(user: CurrentUser, id: string, input: Partial<EmployeeWrite>) {
    assertPermission(user, "employees.manage");
    const employee = db().employees.find((item) => item.id === id);
    if (!employee) throw new ApiError(404, "Employee was not found.");
    Object.assign(employee, {
      first_name: input.first_name ?? employee.first_name,
      last_name: input.last_name ?? employee.last_name,
      email: input.email ?? employee.email,
      job_title: input.job_title ?? employee.job_title,
      department_id: input.department_id ?? employee.department_id,
      team_id: input.team_id === undefined ? employee.team_id : input.team_id,
      manager_id: input.manager_id === undefined ? employee.manager_id : input.manager_id,
      location: input.location ?? employee.location,
      employment_type: input.employment_type ?? employee.employment_type,
      start_date: input.start_date ?? employee.start_date,
      phone: input.phone === undefined ? employee.phone : input.phone,
    });
    if (input.role) {
      const account = db().accounts.find((item) => item.userId === id);
      if (account) account.role = input.role;
    }
    audit(user, "Updated employee", personName(employee));
    saveDb();
    return presentEmployee(employee, user);
  },

  updateProfile(user: CurrentUser, input: ProfileWrite) {
    assertPermission(user, "profile.edit_self");
    const employee = db().employees.find((item) => item.id === user.id);
    if (!employee) throw new ApiError(404, "Employee was not found.");
    employee.preferred_name = input.preferred_name ?? employee.preferred_name;
    employee.phone = input.phone ?? employee.phone;
    employee.bio = input.bio ?? employee.bio;
    employee.personal_email = input.personal_email ?? employee.personal_email;
    employee.emergency_contact_name = input.emergency_contact_name ?? employee.emergency_contact_name;
    employee.emergency_contact_phone = input.emergency_contact_phone ?? employee.emergency_contact_phone;
    saveDb();
    return presentEmployee(employee, user);
  },

  deactivateEmployee(user: CurrentUser, id: string) {
    assertPermission(user, "employees.deactivate");
    if (id === user.id) throw new ApiError(400, "You cannot deactivate your own account.");
    const employee = db().employees.find((item) => item.id === id);
    if (!employee) throw new ApiError(404, "Employee was not found.");
    employee.status = "inactive";
    employee.end_date = todayInTimeZone(db().organisation.timezone);
    audit(user, "Deactivated employee", personName(employee));
    saveDb();
    return presentEmployee(employee, user);
  },

  departments() {
    requireUser();
    return db().departments;
  },

  teams() {
    requireUser();
    return db().teams;
  },

  createDepartment(user: CurrentUser, input: { name: string; code: string; description?: string }) {
    assertPermission(user, "departments.manage");
    const department = {
      id: nextSequence("dept"),
      name: input.name,
      code: input.code.toUpperCase(),
      head_id: null,
      description: input.description ?? "",
    };
    db().departments.push(department);
    audit(user, "Created department", department.name);
    saveDb();
    return department;
  },

  projects(params: Params = {}) {
    const user = requireUser();
    assertPermission(user, "projects.view");
    const search = String(params.search ?? "").trim().toLowerCase();
    let items = db().projects;
    if (search) items = items.filter((project) => includes(project.name, search) || includes(project.key, search));
    if (params.department) items = items.filter((project) => project.department_id === params.department);
    if (params.status) items = items.filter((project) => project.status === params.status);
    return items;
  },

  getProject(id: string) {
    const user = requireUser();
    assertPermission(user, "projects.view");
    const project = db().projects.find((item) => item.id === id);
    if (!project) throw new ApiError(404, "Project was not found.");
    return project;
  },

  saveProject(user: CurrentUser, input: ProjectWrite, id?: string) {
    assertPermission(user, "projects.manage");
    if (id) {
      const project = db().projects.find((item) => item.id === id);
      if (!project) throw new ApiError(404, "Project was not found.");
      Object.assign(project, input);
      saveDb();
      return project;
    }
    const project: Project = { id: nextSequence("prj"), lead_id: input.lead_id ?? null, start_date: input.start_date ?? null, target_date: input.target_date ?? null, ...input };
    db().projects.push(project);
    audit(user, "Created project", project.name);
    saveDb();
    return project;
  },

  settings() {
    requireUser();
    return db().organisation;
  },

  updateSettings(user: CurrentUser, input: Partial<OrganisationSettings>) {
    assertPermission(user, "settings.manage");
    Object.assign(db().organisation, input);
    audit(user, "Updated organisation settings", db().organisation.name);
    saveDb();
    return db().organisation;
  },

  listTasks(params: Params = {}) {
    const user = requireUser();
    let items = visibleTasks(user);
    const search = String(params.search ?? "").trim().toLowerCase();
    if (params.scope === "mine") items = items.filter((task) => task.assignee_id === user.id);
    if (params.review === "1" || params.review === 1 || params.review === true) {
      items = items.filter((task) => task.status === "in_review" && (task.reviewer_id === user.id || hasPermission(user.permissions, "tasks.review")));
    }
    if (params.status) items = items.filter((task) => task.status === params.status);
    if (params.priority) items = items.filter((task) => task.priority === params.priority);
    if (params.assignee) items = items.filter((task) => task.assignee_id === params.assignee);
    if (params.project) items = items.filter((task) => task.project_id === params.project);
    if (params.due_before) items = items.filter((task) => task.due_date && task.due_date <= String(params.due_before));
    if (params.due_after) items = items.filter((task) => task.due_date && task.due_date >= String(params.due_after));
    if (search) {
      items = items.filter((task) =>
        [task.title, task.key, task.description, ...(task.labels ?? [])].some((value) => includes(value, search)),
      );
    }
    const ordering = String(params.ordering ?? "-updated_at");
    items.sort((left, right) => {
      if (ordering === "due_date") return compareDate(left.due_date ?? "9999", right.due_date ?? "9999");
      if (ordering === "-due_date") return compareDate(right.due_date ?? "", left.due_date ?? "");
      if (ordering === "priority") return left.priority.localeCompare(right.priority);
      return right.updated_at.localeCompare(left.updated_at);
    });
    return pageOf(items, params);
  },

  getTask(id: string) {
    const user = requireUser();
    const task = findTask(id, user);
    const comments = db().comments.filter((item) => item.task_id === task.id).map((item) => ({
      ...item,
      author: personRef(item.author_id) ?? item.author,
    }));
    const events = db().events.filter((item) => item.task_id === task.id).map((item) => ({
      ...item,
      actor: personRef(item.actor_id) ?? item.actor,
    }));
    return {
      ...task,
      comments,
      events,
      subtasks: visibleTasks(user).filter((item) => item.parent_id === task.id),
      available_actions: getTaskActions(task, user),
    };
  },

  createTask(input: TaskWrite) {
    const user = requireUser();
    assertPermission(user, "tasks.create");
    const now = new Date().toISOString();
    const number = 2500 + db().tasks.length;
    const task: Task = hydrateTask({
      id: `task_${number}`,
      key: `WH-${number}`,
      title: input.title,
      description: input.description,
      project_id: input.project_id,
      project: { id: input.project_id, name: input.project_id },
      department_id: db().employees.find((item) => item.id === input.assignee_id)?.department_id ?? user.department_id,
      team_id: db().employees.find((item) => item.id === input.assignee_id)?.team_id ?? null,
      assignee_id: input.assignee_id,
      assignee: null,
      reporter_id: user.id,
      reporter: mustPerson(user.id),
      reviewer_id: input.reviewer_id || null,
      reviewer: null,
      priority: input.priority,
      status: input.status ?? "todo",
      assignment_state: "pending_acceptance",
      rejection_reason: null,
      clarification_note: null,
      block_reason: null,
      blocked_from: null,
      start_date: input.start_date || null,
      due_date: input.due_date || null,
      labels: input.labels,
      parent_id: input.parent_id || null,
      attachments: [],
      created_at: now,
      updated_at: now,
    });
    db().tasks.unshift(task);
    addEvent(task.id, user.id, "created the task");
    if (task.assignee_id && task.assignee_id !== user.id) {
      notify(task.assignee_id, "task", "New task assigned", `${personName(user)} assigned ${task.key} to you.`, `/tasks/${task.id}`);
    }
    audit(user, "Created task", task.key);
    saveDb();
    return task;
  },

  updateTask(id: string, input: TaskUpdate) {
    const user = requireUser();
    const existing = findTask(id, user);
    const canEdit =
      hasPermission(user.permissions, "tasks.assign") ||
      existing.reporter_id === user.id ||
      hasPermission(user.permissions, "tasks.view_all");
    if (!canEdit) throw new ApiError(403, "You do not have permission to edit this task.");
    const stored = db().tasks.find((item) => item.id === existing.id)!;
    const previousAssignee = stored.assignee_id;
    Object.assign(stored, {
      title: input.title ?? stored.title,
      description: input.description ?? stored.description,
      project_id: input.project_id ?? stored.project_id,
      priority: input.priority ?? stored.priority,
      start_date: input.start_date === undefined ? stored.start_date : input.start_date,
      due_date: input.due_date === undefined ? stored.due_date : input.due_date,
      labels: input.labels ?? stored.labels,
      parent_id: input.parent_id === undefined ? stored.parent_id : input.parent_id,
      reviewer_id: input.reviewer_id === undefined ? stored.reviewer_id : input.reviewer_id,
      updated_at: new Date().toISOString(),
    });
    if (input.assignee_id && input.assignee_id !== previousAssignee) {
      stored.assignee_id = input.assignee_id;
      stored.assignment_state = "pending_acceptance";
      stored.rejection_reason = null;
      stored.clarification_note = null;
      notify(input.assignee_id, "task", "Task reassigned", `${stored.key} is now assigned to you.`, `/tasks/${stored.id}`);
      addEvent(stored.id, user.id, "reassigned the task");
    }
    saveDb();
    return hydrateTask(stored);
  },

  transitionTask(id: string, action: TaskAction, comment?: string) {
    const user = requireUser();
    const existing = findTask(id, user);
    const stored = db().tasks.find((item) => item.id === existing.id)!;
    try {
      const next = applyTaskAction(hydrateTask(stored), action, user, comment);
      Object.assign(stored, next);
    } catch (error) {
      if (error instanceof TransitionError) throw new ApiError(400, error.message);
      throw error;
    }
    const message = transitionMessage(action, comment);
    addEvent(stored.id, user.id, message);
    if (action === "submit_for_review" && stored.reviewer_id) {
      notify(stored.reviewer_id, "task", "Review requested", `${stored.key} is ready for review.`, `/tasks/${stored.id}`);
    }
    if ((action === "request_changes" || action === "approve") && stored.assignee_id) {
      notify(stored.assignee_id, "task", action === "approve" ? "Task approved" : "Changes requested", `${personName(user)} ${message}.`, `/tasks/${stored.id}`);
    }
    if (action === "reject_assignment" && stored.reporter_id) {
      notify(stored.reporter_id, "task", "Assignment rejected", `${personName(user)} rejected ${stored.key}. ${stored.rejection_reason ?? ""}`.trim(), `/tasks/${stored.id}`);
    }
    saveDb();
    return this.getTask(stored.id);
  },

  addComment(id: string, body: string) {
    const user = requireUser();
    assertPermission(user, "tasks.comment");
    const task = findTask(id, user);
    db().comments.push({
      id: nextSequence("cmt"),
      task_id: task.id,
      author_id: user.id,
      author: mustPerson(user.id),
      body,
      created_at: new Date().toISOString(),
    });
    addEvent(task.id, user.id, "added a comment");
    saveDb();
    return this.getTask(task.id);
  },

  addAttachment(id: string, file: { name: string; size: number; type: string }) {
    const user = requireUser();
    const task = findTask(id, user);
    const stored = db().tasks.find((item) => item.id === task.id)!;
    const attachment: TaskAttachment = {
      id: nextSequence("file"),
      name: file.name,
      size: file.size,
      content_type: file.type || "application/octet-stream",
      url: null,
    };
    stored.attachments.push(attachment);
    addEvent(task.id, user.id, `attached ${file.name}`);
    saveDb();
    return attachment;
  },

  workflow() {
    requireUser();
    return {
      statuses: TASK_STATUS_META,
      actions: [],
      note: "Actions are calculated per task from the signed-in user. The status list is the proposed workflow until GET /tasks/workflow/ returns a different one.",
    };
  },

  attendanceToday() {
    return todayState(requireUser());
  },

  clockIn() {
    const user = requireUser();
    assertPermission(user, "attendance.clock");
    const state = todayState(user);
    if (state.status !== "not_started") {
      throw new ApiError(400, "Clock-in is not available for the current attendance state.");
    }
    const now = new Date();
    const timezone = db().organisation.timezone;
    const date = todayInTimeZone(timezone, now);
    const standard = new Date(dateTimeInTimeZone(date, db().organisation.standard_start, timezone));
    const late = now.getTime() > standard.getTime();
    db().attendance.push({
      id: nextSequence("att"),
      employee_id: user.id,
      employee: mustPerson(user.id),
      department_id: user.department_id,
      date,
      clock_in_at: now.toISOString(),
      clock_out_at: null,
      break_minutes: 0,
      worked_minutes: 0,
      status: late ? "late" : "present",
      exceptions: late ? ["Late arrival"] : [],
      timezone,
    });
    saveDb();
    return todayState(user);
  },

  clockOut() {
    const user = requireUser();
    assertPermission(user, "attendance.clock");
    const state = todayState(user);
    if (state.status !== "clocked_in" && state.status !== "on_break") {
      throw new ApiError(400, "Clock-out is not available until you are clocked in.");
    }
    if (state.status === "on_break") this.endBreak();
    const date = todayInTimeZone(db().organisation.timezone);
    const record = db().attendance.find((item) => item.employee_id === user.id && item.date === date)!;
    record.clock_out_at = new Date().toISOString();
    refreshAttendance(record);
    saveDb();
    return todayState(user);
  },

  startBreak() {
    const user = requireUser();
    const state = todayState(user);
    if (!state.breaks_enabled || state.status !== "clocked_in") {
      throw new ApiError(400, "Breaks can only start while you are clocked in.");
    }
    db().breaks.push({ employee_id: user.id, started_at: new Date().toISOString() });
    saveDb();
    return todayState(user);
  },

  endBreak() {
    const user = requireUser();
    const open = db().breaks.find((item) => item.employee_id === user.id);
    if (!open) throw new ApiError(400, "You are not on a break.");
    const date = todayInTimeZone(db().organisation.timezone);
    const record = db().attendance.find((item) => item.employee_id === user.id && item.date === date);
    if (record) {
      record.break_minutes += Math.max(
        1,
        Math.round((Date.now() - new Date(open.started_at).getTime()) / 60000),
      );
    }
    db().breaks = db().breaks.filter((item) => item.employee_id !== user.id);
    saveDb();
    return todayState(user);
  },

  attendanceRecords(params: Params = {}) {
    const user = requireUser();
    let items = db().attendance.map((record) => refreshAttendance({ ...record }));
    const canManage = hasPermission(user.permissions, "attendance.manage");
    const canTeam = hasPermission(user.permissions, "attendance.view_team");
    if (!canManage) {
      const allowed = new Set(
        (canTeam ? visibleEmployees(user) : [db().employees.find((item) => item.id === user.id)!]).map((employee) => employee.id),
      );
      items = items.filter((record) => allowed.has(record.employee_id));
    }
    if (params.employee) items = items.filter((record) => record.employee_id === params.employee);
    if (params.department) items = items.filter((record) => record.department_id === params.department);
    if (params.from) items = items.filter((record) => record.date >= String(params.from));
    if (params.to) items = items.filter((record) => record.date <= String(params.to));
    if (params.exception === "1" || params.exception === 1) {
      items = items.filter((record) => record.exceptions.length > 0 || (record.clock_in_at && !record.clock_out_at && record.date < todayInTimeZone()));
    }
    items.sort((left, right) => right.date.localeCompare(left.date) || left.employee.name.localeCompare(right.employee.name));
    return pageOf(items, params);
  },

  corrections(params: Params = {}) {
    const user = requireUser();
    let items = db().corrections;
    if (!hasPermission(user.permissions, "attendance.manage")) {
      const team = new Set(visibleEmployees(user).map((employee) => employee.id));
      items = items.filter((item) => item.employee_id === user.id || team.has(item.employee_id));
    }
    if (params.status) items = items.filter((item) => item.status === params.status);
    return pageOf(items, params);
  },

  createCorrection(input: AttendanceCorrectionWrite) {
    const user = requireUser();
    assertPermission(user, "attendance.request_correction");
    if (!input.requested_clock_in_at && !input.requested_clock_out_at) {
      throw new ApiError(400, "Enter the clock-in or clock-out time to correct.");
    }
    const correction: AttendanceCorrection = {
      id: nextSequence("cor"),
      employee_id: user.id,
      employee: mustPerson(user.id),
      date: input.date,
      requested_clock_in_at: input.requested_clock_in_at || null,
      requested_clock_out_at: input.requested_clock_out_at || null,
      reason: input.reason,
      status: "pending",
      reviewer_comment: null,
      created_at: new Date().toISOString(),
      decided_at: null,
    };
    db().corrections.unshift(correction);
    const approvalId = nextSequence("apr");
    db().approvals.unshift({
      id: approvalId,
      type: "attendance_correction",
      subject_id: correction.id,
      employee_id: user.id,
      employee: mustPerson(user.id),
      title: `Attendance correction · ${personName(user)}`,
      summary: input.reason,
      status: "pending",
      submitted_at: correction.created_at,
      decided_at: null,
      decided_by: null,
      comment: null,
      context: [
        { label: "Date", value: input.date },
        { label: "Reason", value: input.reason },
      ],
      history: [{ at: correction.created_at, actor: personName(user), message: "Submitted the correction." }],
    });
    const managerId = db().employees.find((item) => item.id === user.id)?.manager_id;
    if (managerId) notify(managerId, "approval", "Attendance correction", `${personName(user)} requested an attendance correction.`, `/approvals/${approvalId}`);
    saveDb();
    return correction;
  },

  leaveTypes() {
    requireUser();
    return db().leaveTypes;
  },

  leaveBalances(employeeId?: string) {
    const user = requireUser();
    const target = employeeId || user.id;
    if (target !== user.id && !hasPermission(user.permissions, "leave.manage") && !visibleEmployees(user).some((employee) => employee.id === target)) {
      throw new ApiError(403, "You do not have permission to view this balance.");
    }
    return leaveBalances(target);
  },

  leaveRequests(params: Params = {}) {
    const user = requireUser();
    let items = db().leaveRequests;
    if (!hasPermission(user.permissions, "leave.manage")) {
      const team = new Set(visibleEmployees(user).map((employee) => employee.id));
      items = hasPermission(user.permissions, "leave.view_team")
        ? items.filter((item) => team.has(item.employee_id))
        : items.filter((item) => item.employee_id === user.id);
    }
    if (params.mine === "1" || params.scope === "mine") items = items.filter((item) => item.employee_id === user.id);
    if (params.status) items = items.filter((item) => item.status === params.status);
    if (params.employee) items = items.filter((item) => item.employee_id === params.employee);
    if (params.department) items = items.filter((item) => item.department_id === params.department);
    if (params.from) items = items.filter((item) => item.end_date >= String(params.from));
    if (params.to) items = items.filter((item) => item.start_date <= String(params.to));
    items = [...items].sort((left, right) => right.created_at.localeCompare(left.created_at));
    return pageOf(items, params);
  },

  getLeave(id: string) {
    requireUser();
    const request = this.leaveRequests({ page_size: 200 }).results.find((item) => item.id === id);
    if (!request) throw new ApiError(404, "Leave request was not found.");
    return request;
  },

  createLeave(input: LeaveRequestWrite) {
    const user = requireUser();
    assertPermission(user, "leave.request");
    const type = db().leaveTypes.find((item) => item.id === input.leave_type_id);
    if (!type) throw new ApiError(400, "Select a valid leave type.");
    const counted = countLeaveDays(input.start_date, input.end_date, input.partial_day, db().organisation.work_week);
    if (counted.error || counted.days <= 0) {
      throw new ApiError(400, counted.error ?? "The selected dates are not valid.", {
        end_date: [counted.error ?? "The selected dates are not valid."],
      });
    }
    const overlap = db().leaveRequests.find(
      (item) =>
        item.employee_id === user.id &&
        (item.status === "pending" || item.status === "approved") &&
        rangesOverlap(item.start_date, item.end_date, input.start_date, input.end_date),
    );
    if (overlap) {
      throw new ApiError(400, "These dates overlap an existing leave request.", {
        start_date: ["These dates overlap an existing leave request."],
      });
    }
    const balance = leaveBalances(user.id).find((item) => item.leave_type_id === type.id);
    if (balance && counted.days > balance.available_days) {
      throw new ApiError(400, `Only ${balance.available_days} days are available for ${type.name}.`, {
        end_date: [`Only ${balance.available_days} days are available.`],
      });
    }
    const request: LeaveRequest = {
      id: nextSequence("lv"),
      employee_id: user.id,
      employee: mustPerson(user.id),
      department_id: user.department_id,
      leave_type_id: type.id,
      leave_type_name: type.name,
      start_date: input.start_date,
      end_date: input.end_date,
      partial_day: input.partial_day,
      days: counted.days,
      reason: input.reason,
      status: "pending",
      reviewer_comment: null,
      created_at: new Date().toISOString(),
      decided_at: null,
      warnings: [],
    };
    db().leaveRequests.unshift(request);
    const approvalId = nextSequence("apr");
    db().approvals.unshift({
      id: approvalId,
      type: "leave",
      subject_id: request.id,
      employee_id: user.id,
      employee: request.employee,
      title: `${type.name} · ${personName(user)}`,
      summary: input.reason,
      status: "pending",
      submitted_at: request.created_at,
      decided_at: null,
      decided_by: null,
      comment: null,
      context: [
        { label: "Type", value: type.name },
        { label: "Dates", value: `${input.start_date} to ${input.end_date}` },
        { label: "Days", value: String(counted.days) },
      ],
      history: [{ at: request.created_at, actor: personName(user), message: "Submitted the request." }],
    });
    const managerId = db().employees.find((item) => item.id === user.id)?.manager_id;
    if (managerId) notify(managerId, "approval", "Leave request", `${personName(user)} requested ${type.name}.`, `/approvals/${approvalId}`);
    saveDb();
    return request;
  },

  withdrawLeave(id: string) {
    const user = requireUser();
    const request = db().leaveRequests.find((item) => item.id === id);
    if (!request || request.employee_id !== user.id) throw new ApiError(404, "Leave request was not found.");
    if (request.status !== "pending") throw new ApiError(400, "Only a pending request can be withdrawn.");
    request.status = "withdrawn";
    const approval = db().approvals.find((item) => item.subject_id === id && item.status === "pending");
    if (approval) {
      approval.status = "rejected";
      approval.comment = "Withdrawn by the employee.";
      approval.decided_at = new Date().toISOString();
    }
    saveDb();
    return request;
  },

  cancelLeave(id: string) {
    const user = requireUser();
    const request = db().leaveRequests.find((item) => item.id === id);
    if (!request) throw new ApiError(404, "Leave request was not found.");
    const allowed = request.employee_id === user.id || hasPermission(user.permissions, "leave.manage");
    if (!allowed) throw new ApiError(403, "You do not have permission to cancel this request.");
    if (request.status !== "approved") throw new ApiError(400, "Only an approved request can be cancelled.");
    if (request.start_date < todayInTimeZone(db().organisation.timezone)) {
      throw new ApiError(400, "Leave that has already started cannot be cancelled here.");
    }
    request.status = "cancelled";
    request.decided_at = new Date().toISOString();
    saveDb();
    return request;
  },

  approvals(params: Params = {}) {
    const user = requireUser();
    assertPermission(user, "approvals.view");
    let items = db().approvals.filter((item) => canSeeApproval(user, item));
    if (params.status) items = items.filter((item) => item.status === params.status);
    else if (!params.include_closed) items = items.filter((item) => item.status === "pending" || item.status === "changes_requested");
    if (params.type) items = items.filter((item) => item.type === params.type);
    if (params.employee) items = items.filter((item) => item.employee_id === params.employee);
    if (params.from) items = items.filter((item) => item.submitted_at.slice(0, 10) >= String(params.from));
    if (params.to) items = items.filter((item) => item.submitted_at.slice(0, 10) <= String(params.to));
    return pageOf(items, params);
  },

  getApproval(id: string) {
    const user = requireUser();
    const approval = db().approvals.find((item) => item.id === id);
    if (!approval || !canSeeApproval(user, approval)) throw new ApiError(404, "Approval was not found.");
    return approval;
  },

  decideApproval(id: string, input: ApprovalDecisionRequest) {
    const user = requireUser();
    assertPermission(user, "approvals.decide");
    const approval = this.getApproval(id);
    if (approval.status === "approved" || approval.status === "rejected") {
      throw new ApiError(409, "This request already has a final decision. Refresh the inbox.");
    }
    const comment = input.comment?.trim() ?? "";
    if (input.decision !== "approve" && comment.length < 3) {
      throw new ApiError(400, "A comment is required for this decision.", {
        comment: ["A comment is required for this decision."],
      });
    }
    const now = new Date().toISOString();
    approval.comment = comment || null;
    approval.decided_at = now;
    approval.decided_by = user.id;
    approval.history.push({ at: now, actor: personName(user), message: `${input.decision.replaceAll("_", " ")}${comment ? `: ${comment}` : ""}` });
    if (input.decision === "request_changes") {
      approval.status = "changes_requested";
    } else {
      approval.status = input.decision === "approve" ? "approved" : "rejected";
      applyDecision(approval, input.decision === "approve", comment);
    }
    notify(approval.employee_id, "approval", `Request ${approval.status.replaceAll("_", " ")}`, approval.title, `/approvals/${approval.id}`);
    audit(user, `${input.decision} request`, approval.title);
    saveDb();
    return approval;
  },

  notifications(params: Params = {}) {
    const user = requireUser();
    let items = db().notifications.filter((item) => item.recipient_id === user.id);
    if (params.category) items = items.filter((item) => item.category === params.category);
    if (params.unread === "1" || params.unread === 1) items = items.filter((item) => !item.read_at);
    items = [...items].sort((left, right) => right.created_at.localeCompare(left.created_at));
    return pageOf(items, params);
  },

  unreadCount() {
    const user = requireUser();
    return db().notifications.filter((item) => item.recipient_id === user.id && !item.read_at).length;
  },

  markRead(id: string) {
    const user = requireUser();
    const item = db().notifications.find((notification) => notification.id === id && notification.recipient_id === user.id);
    if (!item) throw new ApiError(404, "Notification was not found.");
    item.read_at = new Date().toISOString();
    saveDb();
    return item;
  },

  markAllRead() {
    const user = requireUser();
    const now = new Date().toISOString();
    for (const item of db().notifications) {
      if (item.recipient_id === user.id && !item.read_at) item.read_at = now;
    }
    saveDb();
    return { detail: "All notifications marked as read." };
  },

  preferences() {
    requireUser();
    return db().preferences;
  },

  updatePreferences(input: NotificationPreferences) {
    requireUser();
    db().preferences = input;
    saveDb();
    return db().preferences;
  },

  dashboard(params: Params = {}): DashboardResponse {
    params.department = params.department ?? params.department_id;
    const user = requireUser();
    const from = String(params.from ?? shiftDate(-30));
    const to = String(params.to ?? todayInTimeZone());
    const department = params.department ? String(params.department) : null;
    const tasks = visibleTasks(user).filter((task) => !department || task.department_id === department);
    const today = todayInTimeZone();
    const open = tasks.filter((task) => task.status !== "done");
    const overdue = open.filter((task) => task.due_date && task.due_date < today);
    const summary = TASK_STATUS_META.map((status) => ({
      status: status.id,
      count: tasks.filter((task) => task.status === status.id).length,
    }));
    const org = hasPermission(user.permissions, "reports.view_org");
    const teamScope =
      !org &&
      (hasPermission(user.permissions, "reports.view_team") ||
        hasPermission(user.permissions, "tasks.view_team") ||
        hasPermission(user.permissions, "tasks.view_all"));
    const balances = leaveBalances(user.id);
    const myPending = db().leaveRequests.filter((item) => item.employee_id === user.id && item.status === "pending");
    const activity = db().events
      .filter((event) => tasks.some((task) => task.id === event.task_id))
      .slice(0, 8)
      .map((event) => ({
        id: event.id,
        actor_name: (personRef(event.actor_id) ?? event.actor).name,
        message: `${event.message}`,
        created_at: event.created_at,
        href: `/tasks/${event.task_id}`,
      }));

    const response: DashboardResponse = {
      generated_at: new Date().toISOString(),
      scope: org ? "organisation" : teamScope ? "team" : "self",
      range: { from, to },
      filters: { department_id: department },
      greeting_name: personName(user),
      metrics: [],
      attendance_today: hasPermission(user.permissions, "attendance.clock") ? todayState(user) : null,
      task_summary: summary,
      upcoming_deadlines: open
        .filter((task) => task.due_date && task.due_date >= today && task.due_date <= shiftDate(7))
        .sort((left, right) => compareDate(left.due_date ?? "", right.due_date ?? ""))
        .slice(0, 5),
      overdue_tasks: overdue.slice(0, 5),
      leave_balances: balances,
      pending_requests: myPending,
      notifications: db().notifications.filter((item) => item.recipient_id === user.id).slice(0, 5),
      activity,
      team: null,
      organisation: null,
    };

    if (teamScope || org) {
      const members = visibleEmployees(user).filter((employee) => employee.status !== "inactive");
      const approvals = db().approvals.filter((item) => item.status === "pending" && canSeeApproval(user, item));
      response.team = {
        member_count: members.length,
        awaiting_review: tasks.filter((task) => task.status === "in_review").length,
        pending_approvals: approvals.length,
        attendance_exceptions: hasPermission(user.permissions, "attendance.view_team") || org
          ? db().attendance.filter((record) => record.exceptions.length > 0 && (!department || record.department_id === department)).slice(0, 6)
          : [],
        upcoming_leave: hasPermission(user.permissions, "leave.view_team") || org
          ? db().leaveRequests.filter((item) => item.status === "approved" && item.end_date >= today).slice(0, 5)
          : [],
        workload: workload(tasks),
      };
    }

    if (org) {
      const people = db().employees.filter((employee) => !department || employee.department_id === department);
      const active = people.filter((employee) => employee.status === "active" || employee.status === "on_leave");
      const todayRecords = db().attendance.filter((record) => record.date === today && (!department || record.department_id === department));
      response.organisation = {
        total_employees: people.length,
        active_employees: active.length,
        departments: db().departments.map((departmentItem) => ({
          id: departmentItem.id,
          name: departmentItem.name,
          count: people.filter((employee) => employee.department_id === departmentItem.id && employee.status !== "inactive").length,
        })),
        attendance_summary: {
          present: todayRecords.filter((record) => record.status === "present").length,
          late: todayRecords.filter((record) => record.status === "late").length,
          absent: Math.max(0, active.length - todayRecords.length),
          on_leave: people.filter((employee) => employee.status === "on_leave").length,
        },
        pending_leave: db().approvals.filter((item) => item.type === "leave" && item.status === "pending").length,
        pending_hr: db().approvals.filter((item) => (item.type === "hr_request" || item.type === "profile_change") && item.status === "pending").length,
        joiners: people.filter((employee) => employee.status === "invited" || employee.start_date >= shiftDate(-45)).slice(0, 5),
        exits: people.filter((employee) => employee.status === "inactive" && employee.end_date && employee.end_date >= from).slice(0, 5),
        audit: hasPermission(user.permissions, "audit.view") ? db().audit.slice(0, 6) : [],
      };
      response.metrics = [
        { id: "employees", label: "Active employees", value: String(active.length), href: "/employees", tone: "info" },
        { id: "leave", label: "Pending leave", value: String(response.organisation.pending_leave), href: "/approvals?type=leave", tone: "warning" },
        { id: "hr", label: "Pending HR requests", value: String(response.organisation.pending_hr), href: "/approvals?type=hr_request" },
        { id: "overdue", label: "Overdue tasks", value: String(overdue.length), href: "/tasks?scope=overdue", tone: overdue.length ? "danger" : "success" },
      ];
    } else if (teamScope && response.team) {
      response.metrics = [
        { id: "members", label: "Team members", value: String(response.team.member_count), href: "/teams" },
        { id: "review", label: "Awaiting review", value: String(response.team.awaiting_review), href: "/tasks/review", tone: "info" },
        { id: "approvals", label: "Pending approvals", value: String(response.team.pending_approvals), href: "/approvals", tone: "warning" },
        { id: "overdue", label: "Overdue tasks", value: String(overdue.length), href: "/tasks/board", tone: overdue.length ? "danger" : "success" },
      ];
    } else {
      response.metrics = [
        { id: "open", label: "Open tasks", value: String(open.filter((task) => task.assignee_id === user.id).length), href: "/tasks" },
        { id: "overdue", label: "Overdue", value: String(overdue.filter((task) => task.assignee_id === user.id).length), href: "/tasks", tone: "danger" },
        { id: "leave", label: "Annual leave left", value: String(balances.find((item) => item.code === "AL")?.available_days ?? "—"), href: "/leave", tone: "success" },
        { id: "requests", label: "Pending requests", value: String(myPending.length), href: "/leave", tone: "warning" },
      ];
    }
    return response;
  },

  taskReport(params: Params = {}) {
    params.department = params.department ?? params.department_id;
    const user = requireUser();
    if (!hasPermission(user.permissions, "reports.view_team") && !hasPermission(user.permissions, "reports.view_org")) {
      throw new ApiError(403, "You do not have permission to view this report.");
    }
    const tasks = visibleTasks(user).filter((task) => !params.department || task.department_id === params.department);
    const today = todayInTimeZone();
    return {
      range: { from: String(params.from ?? shiftDate(-30)), to: String(params.to ?? today) },
      department_id: params.department ? String(params.department) : null,
      by_status: TASK_STATUS_META.map((status) => ({ status: status.id, count: tasks.filter((task) => task.status === status.id).length })),
      by_priority: (["low", "medium", "high", "urgent"] as const).map((priority) => ({
        priority,
        count: tasks.filter((task) => task.priority === priority && task.status !== "done").length,
      })),
      overdue: tasks.filter((task) => task.status !== "done" && task.due_date && task.due_date < today),
      workload: workload(tasks),
      completed_in_range: tasks.filter((task) => task.status === "done").length,
      open_tasks: tasks.filter((task) => task.status !== "done").length,
    };
  },

  attendanceReport(params: Params = {}) {
    params.department = params.department ?? params.department_id;
    const user = requireUser();
    assertPermission(user, "reports.view_org");
    const from = String(params.from ?? shiftDate(-14));
    const to = String(params.to ?? todayInTimeZone());
    let records = db().attendance.filter((record) => record.date >= from && record.date <= to);
    if (params.department) records = records.filter((record) => record.department_id === params.department);
    const days = Array.from(new Set(records.map((record) => record.date))).sort();
    return {
      range: { from, to },
      department_id: params.department ? String(params.department) : null,
      summary: {
        present: records.filter((record) => record.status === "present").length,
        late: records.filter((record) => record.status === "late").length,
        absent: records.filter((record) => record.status === "absent").length,
        partial: records.filter((record) => record.status === "partial").length,
      },
      by_day: days.map((date) => ({
        date,
        present: records.filter((record) => record.date === date && record.status === "present").length,
        late: records.filter((record) => record.date === date && record.status === "late").length,
        absent: records.filter((record) => record.date === date && (record.status === "absent" || record.status === "partial")).length,
      })),
      exceptions: records.filter((record) => record.exceptions.length > 0).slice(0, 50),
    };
  },

  leaveReport(params: Params = {}) {
    params.department = params.department ?? params.department_id;
    const user = requireUser();
    if (!hasPermission(user.permissions, "reports.view_team") && !hasPermission(user.permissions, "reports.view_org")) {
      throw new ApiError(403, "You do not have permission to view this report.");
    }
    const from = String(params.from ?? shiftDate(-30));
    const to = String(params.to ?? shiftDate(30));
    let requests = db().leaveRequests.filter((item) => item.end_date >= from && item.start_date <= to);
    if (!hasPermission(user.permissions, "reports.view_org")) {
      const team = new Set(visibleEmployees(user).map((employee) => employee.id));
      requests = requests.filter((item) => team.has(item.employee_id));
    }
    if (params.department) requests = requests.filter((item) => item.department_id === params.department);
    return {
      range: { from, to },
      department_id: params.department ? String(params.department) : null,
      by_type: db().leaveTypes.map((type) => ({
        leave_type_name: type.name,
        allocated_days: db().allocations.filter((item) => item.leave_type_id === type.id).reduce((sum, item) => sum + item.allocated_days, 0),
        used_days: requests.filter((item) => item.leave_type_id === type.id && item.status === "approved").reduce((sum, item) => sum + item.days, 0),
        pending_days: requests.filter((item) => item.leave_type_id === type.id && item.status === "pending").reduce((sum, item) => sum + item.days, 0),
      })),
      requests,
    };
  },

  headcountReport(params: Params = {}) {
    params.department = params.department ?? params.department_id;
    const user = requireUser();
    assertPermission(user, "reports.view_org");
    const from = String(params.from ?? shiftDate(-90));
    const to = String(params.to ?? todayInTimeZone());
    let people = db().employees;
    if (params.department) people = people.filter((employee) => employee.department_id === params.department);
    const active = people.filter((employee) => employee.status !== "inactive");
    return {
      range: { from, to },
      department_id: params.department ? String(params.department) : null,
      total: people.length,
      active: active.length,
      by_department: db().departments.map((department) => ({
        name: department.name,
        count: active.filter((employee) => employee.department_id === department.id).length,
      })),
      by_type: (["full_time", "part_time", "contract", "intern"] as const).map((employment_type) => ({
        employment_type,
        count: active.filter((employee) => employee.employment_type === employment_type).length,
      })),
      joiners: people.filter((employee) => employee.start_date >= from && employee.start_date <= to),
      exits: people.filter((employee) => employee.end_date && employee.end_date >= from && employee.end_date <= to),
    };
  },

  search(query: string) {
    const user = requireUser();
    const params = { search: query, page_size: 5 };
    return {
      tasks: hasPermission(user.permissions, "tasks.view_own") ? this.listTasks(params).results : [],
      employees: this.listEmployees(user, params).results,
      projects: hasPermission(user.permissions, "projects.view") ? this.projects(params).slice(0, 5) : [],
    };
  },

  onboarding() {
    const user = requireUser();
    assertPermission(user, "onboarding.view");
    return db().onboarding;
  },

  toggleOnboarding(caseId: string, itemId: string) {
    const user = requireUser();
    assertPermission(user, "onboarding.view");
    const item = db().onboarding.find((entry) => entry.id === caseId)?.items.find((entry) => entry.id === itemId);
    if (!item) throw new ApiError(404, "Checklist item was not found.");
    item.done = !item.done;
    const entry = db().onboarding.find((record) => record.id === caseId)!;
    entry.status = entry.items.every((record) => record.done) ? "completed" : "in_progress";
    saveDb();
    return entry;
  },

  offboarding() {
    const user = requireUser();
    assertPermission(user, "onboarding.view");
    return db().offboarding;
  },

  assets() {
    const user = requireUser();
    assertPermission(user, "onboarding.view");
    return db().assets;
  },

  audit(params: Params = {}) {
    const user = requireUser();
    assertPermission(user, "audit.view");
    const search = String(params.search ?? "").trim().toLowerCase();
    let items = db().audit;
    if (search) items = items.filter((item) => includes(item.action, search) || includes(item.target, search) || includes(item.actor_name, search));
    return pageOf(items, params);
  },
};

function workload(tasks: Task[]) {
  const map = new Map<string, { employee_id: string; name: string; open_tasks: number; overdue: number }>();
  const today = todayInTimeZone();
  for (const task of tasks) {
    if (!task.assignee_id || !task.assignee || task.status === "done") continue;
    const current = map.get(task.assignee_id) ?? {
      employee_id: task.assignee_id,
      name: task.assignee.name,
      open_tasks: 0,
      overdue: 0,
    };
    current.open_tasks += 1;
    if (task.due_date && task.due_date < today) current.overdue += 1;
    map.set(task.assignee_id, current);
  }
  return Array.from(map.values()).sort((left, right) => right.open_tasks - left.open_tasks);
}

function applyDecision(approval: Approval, approved: boolean, comment: string) {
  if (approval.type === "leave") {
    const request = db().leaveRequests.find((item) => item.id === approval.subject_id);
    if (!request) return;
    request.status = approved ? "approved" : "rejected";
    request.reviewer_comment = comment || null;
    request.decided_at = new Date().toISOString();
    if (approved && request.employee_id) {
      const employee = db().employees.find((item) => item.id === request.employee_id);
      const today = todayInTimeZone();
      if (employee && request.start_date <= today && request.end_date >= today) employee.status = "on_leave";
    }
  }
  if (approval.type === "attendance_correction") {
    const correction = db().corrections.find((item) => item.id === approval.subject_id);
    if (!correction) return;
    correction.status = approved ? "approved" : "rejected";
    correction.reviewer_comment = comment || null;
    correction.decided_at = new Date().toISOString();
    if (approved) {
      const record = db().attendance.find((item) => item.employee_id === correction.employee_id && item.date === correction.date);
      if (record) {
        if (correction.requested_clock_in_at) record.clock_in_at = correction.requested_clock_in_at;
        if (correction.requested_clock_out_at) record.clock_out_at = correction.requested_clock_out_at;
        record.exceptions = record.exceptions.filter((item) => item !== "Missing clock-out");
        refreshAttendance(record);
      }
    }
  }
  if (approval.type === "profile_change" && approved) {
    const employee = db().employees.find((item) => item.id === approval.employee_id);
    if (employee) employee.preferred_name = "Lee Chen";
  }
  if (approval.type === "hr_request" && approved) {
    const asset = db().assets.find((item) => item.status === "available");
    if (asset) {
      asset.status = "assigned";
      asset.assigned_to = approval.employee_id;
      asset.assignee = personRef(approval.employee_id);
    }
  }
}

export async function withDemoLatency<T>(value: T): Promise<T> {
  if (process.env.VITEST !== "true") {
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  return value;
}
