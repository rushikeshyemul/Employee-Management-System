import { ROLE_PERMISSIONS } from "@/lib/permissions";
import {
  dateTimeInTimeZone,
  personName,
  shiftDate,
} from "@/lib/format";
import type {
  Approval,
  Asset,
  AttendanceRecord,
  CurrentUser,
  Department,
  Employee,
  EmploymentStatus,
  EmploymentType,
  LeaveRequest,
  LeaveType,
  OffboardingCase,
  OnboardingCase,
  OrganisationSettings,
  Project,
  Role,
  Task,
  TaskComment,
  TaskEvent,
  Team,
} from "@/types";

export const DEMO_PASSWORD = "WorkforceHub1!";
export const DB_VERSION = 1;

export const ID = {
  anika: "emp_anika",
  rohan: "emp_rohan",
  priya: "emp_priya",
  daniel: "emp_daniel",
  meera: "emp_meera",
  kabir: "emp_kabir",
  sofia: "emp_sofia",
  liam: "emp_liam",
  aisha: "emp_aisha",
  noah: "emp_noah",
  hannah: "emp_hannah",
  vikram: "emp_vikram",
  elena: "emp_elena",
  omar: "emp_omar",
  grace: "emp_grace",
  nico: "emp_nico",
  eng: "dept_eng",
  product: "dept_product",
  people: "dept_people",
  finance: "dept_finance",
  ops: "dept_ops",
  platform: "team_platform",
  apps: "team_apps",
  peopleOps: "team_people",
  financeTeam: "team_finance",
  opsTeam: "team_ops",
  hub: "prj_hub",
  pay: "prj_pay",
  portal: "prj_portal",
  hiring: "prj_hiring",
  office: "prj_office",
  annual: "lt_annual",
  sick: "lt_sick",
  casual: "lt_casual",
} as const;

export interface DemoAccount {
  email: string;
  password: string;
  userId: string;
  role: Role;
}

export interface Database {
  version: number;
  organisation: OrganisationSettings;
  departments: Department[];
  teams: Team[];
  accounts: DemoAccount[];
  employees: Employee[];
  projects: Project[];
  tasks: Task[];
  comments: TaskComment[];
  events: TaskEvent[];
  attendance: AttendanceRecord[];
  breaks: { employee_id: string; started_at: string }[];
  corrections: import("@/types").AttendanceCorrection[];
  leaveTypes: LeaveType[];
  allocations: {
    employee_id: string;
    leave_type_id: string;
    allocated_days: number;
  }[];
  leaveRequests: LeaveRequest[];
  approvals: Approval[];
  notifications: import("@/types").AppNotification[];
  preferences: import("@/types").NotificationPreferences;
  audit: import("@/types").AuditEvent[];
  onboarding: OnboardingCase[];
  offboarding: OffboardingCase[];
  assets: Asset[];
  sequence: number;
}

interface PersonSeed {
  id: string;
  code: string;
  first: string;
  last: string;
  email: string;
  title: string;
  department: string;
  team: string | null;
  manager: string | null;
  location: string;
  type: EmploymentType;
  status: EmploymentStatus;
  started: number;
  ended?: number;
  role: Role;
  phone: string;
  salary: string;
  dob: string;
}

const PEOPLE: PersonSeed[] = [
  { id: ID.anika, code: "HX-1001", first: "Anika", last: "Shah", email: "super.admin@helios.example", title: "Platform Administrator", department: ID.people, team: ID.peopleOps, manager: null, location: "Bengaluru", type: "full_time", status: "active", started: -900, role: "super_admin", phone: "+91 98450 10001", salary: "L8", dob: "1986-04-12" },
  { id: ID.rohan, code: "HX-1008", first: "Rohan", last: "Mehta", email: "hr.admin@helios.example", title: "HR Business Partner", department: ID.people, team: ID.peopleOps, manager: ID.anika, location: "Mumbai", type: "full_time", status: "active", started: -740, role: "hr_admin", phone: "+91 98200 10008", salary: "L6", dob: "1990-11-02" },
  { id: ID.priya, code: "HX-1042", first: "Priya", last: "Nair", email: "manager@helios.example", title: "Engineering Manager", department: ID.eng, team: ID.platform, manager: ID.anika, location: "Bengaluru", type: "full_time", status: "active", started: -610, role: "manager", phone: "+91 98860 10442", salary: "L7", dob: "1988-07-19" },
  { id: ID.daniel, code: "HX-1104", first: "Daniel", last: "Okonkwo", email: "project.manager@helios.example", title: "Technical Project Manager", department: ID.product, team: ID.apps, manager: ID.priya, location: "London", type: "full_time", status: "active", started: -420, role: "project_manager", phone: "+44 7700 900104", salary: "L6", dob: "1991-01-28" },
  { id: ID.meera, code: "HX-1188", first: "Meera", last: "Iyer", email: "employee@helios.example", title: "Software Engineer", department: ID.eng, team: ID.platform, manager: ID.priya, location: "Bengaluru", type: "full_time", status: "active", started: -280, role: "employee", phone: "+91 98450 11880", salary: "L4", dob: "1996-09-14" },
  { id: ID.kabir, code: "HX-1194", first: "Kabir", last: "Das", email: "kabir.das@helios.example", title: "Software Engineer", department: ID.eng, team: ID.platform, manager: ID.priya, location: "Remote", type: "full_time", status: "active", started: -240, role: "employee", phone: "+91 98310 11940", salary: "L4", dob: "1995-03-03" },
  { id: ID.sofia, code: "HX-1210", first: "Sofia", last: "Alvarez", email: "sofia.alvarez@helios.example", title: "Senior Software Engineer", department: ID.eng, team: ID.apps, manager: ID.priya, location: "London", type: "full_time", status: "active", started: -500, role: "employee", phone: "+44 7700 900210", salary: "L5", dob: "1992-12-08" },
  { id: ID.liam, code: "HX-1302", first: "Liam", last: "Chen", email: "liam.chen@helios.example", title: "Product Designer", department: ID.product, team: ID.apps, manager: ID.daniel, location: "Remote", type: "full_time", status: "active", started: -190, role: "employee", phone: "+1 415 555 0142", salary: "L4", dob: "1994-06-21" },
  { id: ID.aisha, code: "HX-1411", first: "Aisha", last: "Rahman", email: "aisha.rahman@helios.example", title: "Payroll Specialist", department: ID.finance, team: ID.financeTeam, manager: ID.anika, location: "Mumbai", type: "full_time", status: "active", started: -330, role: "employee", phone: "+91 98200 14110", salary: "L4", dob: "1993-02-17" },
  { id: ID.omar, code: "HX-1418", first: "Omar", last: "Farouk", email: "omar.farouk@helios.example", title: "Accountant", department: ID.finance, team: ID.financeTeam, manager: ID.anika, location: "Bengaluru", type: "full_time", status: "active", started: -260, role: "employee", phone: "+91 98450 14180", salary: "L4", dob: "1991-08-30" },
  { id: ID.hannah, code: "HX-1502", first: "Hannah", last: "Brooks", email: "hannah.brooks@helios.example", title: "Operations Manager", department: ID.ops, team: ID.opsTeam, manager: ID.anika, location: "Mumbai", type: "full_time", status: "active", started: -800, role: "manager", phone: "+91 98200 15020", salary: "L6", dob: "1987-05-11" },
  { id: ID.noah, code: "HX-1516", first: "Noah", last: "Williams", email: "noah.williams@helios.example", title: "Operations Coordinator", department: ID.ops, team: ID.opsTeam, manager: ID.hannah, location: "Mumbai", type: "contract", status: "active", started: -120, role: "employee", phone: "+91 98200 15160", salary: "C2", dob: "1997-10-09" },
  { id: ID.vikram, code: "HX-1222", first: "Vikram", last: "Patel", email: "vikram.patel@helios.example", title: "Software Engineer", department: ID.eng, team: ID.apps, manager: ID.priya, location: "Bengaluru", type: "full_time", status: "on_leave", started: -400, role: "employee", phone: "+91 98450 12220", salary: "L4", dob: "1994-01-25" },
  { id: ID.elena, code: "HX-1088", first: "Elena", last: "Petrova", email: "elena.petrova@helios.example", title: "Recruiter", department: ID.people, team: ID.peopleOps, manager: ID.rohan, location: "Remote", type: "full_time", status: "active", started: -210, role: "employee", phone: "+49 151 0000880", salary: "L3", dob: "1995-07-07" },
  { id: ID.grace, code: "HX-1601", first: "Grace", last: "Kim", email: "grace.kim@helios.example", title: "Software Engineer", department: ID.eng, team: ID.platform, manager: ID.priya, location: "Bengaluru", type: "full_time", status: "invited", started: 10, role: "employee", phone: "", salary: "L3", dob: "1998-04-04" },
  { id: ID.nico, code: "HX-0904", first: "Nico", last: "Rossi", email: "nico.rossi@helios.example", title: "Operations Associate", department: ID.ops, team: ID.opsTeam, manager: ID.hannah, location: "London", type: "full_time", status: "inactive", started: -700, ended: -12, role: "employee", phone: "", salary: "L3", dob: "1990-09-09" },
];

function employeeFrom(seed: PersonSeed): Employee {
  return {
    id: seed.id,
    user_id: seed.id,
    employee_code: seed.code,
    first_name: seed.first,
    last_name: seed.last,
    email: seed.email,
    phone: seed.phone || null,
    job_title: seed.title,
    department_id: seed.department,
    team_id: seed.team,
    manager_id: seed.manager,
    location: seed.location,
    employment_type: seed.type,
    status: seed.status,
    start_date: shiftDate(seed.started),
    end_date: seed.ended === undefined ? null : shiftDate(seed.ended),
    bio: "",
    personal_email: seed.status === "inactive" ? null : `${seed.first}.${seed.last}@personal.example`.toLowerCase(),
    emergency_contact_name: seed.status === "invited" ? null : `${seed.last} family`,
    emergency_contact_phone: seed.phone || null,
    salary_band: seed.salary,
    date_of_birth: seed.dob,
  };
}

export function userFrom(employee: Employee, role: Role): CurrentUser {
  return {
    id: employee.id,
    email: employee.email,
    first_name: employee.first_name,
    last_name: employee.last_name,
    preferred_name: employee.preferred_name,
    role,
    permissions: [...ROLE_PERMISSIONS[role]],
    employee_id: employee.id,
    job_title: employee.job_title,
    department_id: employee.department_id,
    team_id: employee.team_id,
    manager_id: employee.manager_id,
    timezone: "Asia/Kolkata",
    avatar_url: null,
  };
}

function ref(employees: Employee[], id: string | null) {
  if (!id) return null;
  const employee = employees.find((item) => item.id === id);
  if (!employee) return null;
  return {
    id: employee.id,
    name: personName(employee),
    job_title: employee.job_title,
    avatar_url: employee.avatar_url,
  };
}

export function createSeed(): Database {
  const employees = PEOPLE.map(employeeFrom);
  const accounts: DemoAccount[] = PEOPLE.filter((person) => person.status !== "inactive").map((person) => ({
    email: person.email,
    password: DEMO_PASSWORD,
    userId: person.id,
    role: person.role,
  }));

  const departments: Department[] = [
    { id: ID.eng, name: "Engineering", code: "ENG", head_id: ID.priya, description: "Product engineering and platform." },
    { id: ID.product, name: "Product", code: "PRD", head_id: ID.daniel, description: "Design and delivery." },
    { id: ID.people, name: "People", code: "PPL", head_id: ID.rohan, description: "HR operations and hiring." },
    { id: ID.finance, name: "Finance", code: "FIN", head_id: ID.anika, description: "Payroll and accounting." },
    { id: ID.ops, name: "Operations", code: "OPS", head_id: ID.hannah, description: "Workplace and vendor operations." },
  ];

  const teams: Team[] = [
    { id: ID.platform, name: "Platform", department_id: ID.eng, lead_id: ID.priya, description: "Workforce Hub platform." },
    { id: ID.apps, name: "Applications", department_id: ID.eng, lead_id: ID.sofia, description: "Product applications." },
    { id: ID.peopleOps, name: "People Operations", department_id: ID.people, lead_id: ID.rohan, description: "Employee lifecycle." },
    { id: ID.financeTeam, name: "Finance Operations", department_id: ID.finance, lead_id: ID.aisha, description: "Payroll and close." },
    { id: ID.opsTeam, name: "Workplace", department_id: ID.ops, lead_id: ID.hannah, description: "Offices and vendors." },
  ];

  const projects: Project[] = [
    { id: ID.hub, key: "WH", name: "Workforce Hub Rollout", description: "Replace the spreadsheet tracker with Workforce Hub.", department_id: ID.eng, lead_id: ID.priya, status: "active", start_date: shiftDate(-40), target_date: shiftDate(30) },
    { id: ID.pay, key: "PAY", name: "Payroll Integration", description: "Map attendance and leave into payroll.", department_id: ID.finance, lead_id: ID.aisha, status: "active", start_date: shiftDate(-20), target_date: shiftDate(25) },
    { id: ID.portal, key: "POR", name: "Customer Portal", description: "Empty states and account tasks for the portal.", department_id: ID.product, lead_id: ID.daniel, status: "active", start_date: shiftDate(-15), target_date: shiftDate(40) },
    { id: ID.hiring, key: "HIR", name: "Q4 Hiring", description: "Engineering and operations hiring plan.", department_id: ID.people, lead_id: ID.rohan, status: "active", start_date: shiftDate(-10), target_date: shiftDate(50) },
    { id: ID.office, key: "OFF", name: "Office Relocation", description: "Mumbai workplace move.", department_id: ID.ops, lead_id: ID.hannah, status: "planned", start_date: shiftDate(5), target_date: shiftDate(70) },
  ];

  const projectRef = (id: string) => {
    const project = projects.find((item) => item.id === id)!;
    return { id: project.id, name: project.name, key: project.key };
  };

  const stamp = (days: number, time: string) => dateTimeInTimeZone(shiftDate(days), time);

  const tasks: Task[] = [
    task("2401", "Wire the attendance clock to server state", ID.meera, ID.priya, ID.priya, ID.hub, "in_progress", "accepted", "high", 2, -6),
    task("2402", "Design the leave calendar", ID.liam, ID.daniel, ID.daniel, ID.portal, "todo", "pending_acceptance", "medium", 4, -2),
    task("2403", "Map payroll export columns", ID.aisha, ID.daniel, ID.anika, ID.pay, "in_review", "accepted", "high", 1, -8),
    task("2404", "Show missing clock-out exceptions", ID.kabir, ID.priya, ID.priya, ID.hub, "changes_requested", "accepted", "high", -1, -9),
    task("2405", "Draft the office move checklist", ID.noah, ID.hannah, ID.hannah, ID.office, "todo", "accepted", "low", 6, -4),
    task("2406", "Migrate legacy status badges", ID.sofia, ID.priya, ID.priya, ID.hub, "todo", "rejected", "medium", 8, -3),
    task("2407", "Define the hiring scorecard", ID.elena, ID.rohan, ID.rohan, ID.hiring, "todo", "clarification_requested", "medium", 3, -5),
    task("2408", "Rotate the SSO certificate", ID.kabir, ID.priya, ID.priya, ID.hub, "blocked", "accepted", "urgent", 2, -7),
    task("2409", "Add directory filters", ID.meera, ID.priya, ID.priya, ID.hub, "done", "accepted", "medium", -3, -18),
    task("2410", "Asset return workflow", ID.meera, ID.daniel, ID.priya, ID.hub, "backlog", "pending_acceptance", "low", 20, -1),
    task("2411", "Portal empty states", ID.liam, ID.daniel, ID.daniel, ID.portal, "in_review", "accepted", "medium", 1, -6),
    task("2412", "Month-end reconciliation notes", ID.omar, ID.anika, ID.anika, ID.pay, "in_progress", "accepted", "high", -2, -11),
    task("2413", "Team workload chart", ID.meera, ID.priya, ID.priya, ID.hub, "todo", "accepted", "medium", 5, -4),
    task("2414", "Accessible data table under the workload chart", ID.meera, ID.priya, ID.priya, ID.hub, "todo", "accepted", "medium", 5, -4),
    task("2415", "Onboarding checklist draft", ID.elena, ID.rohan, ID.rohan, ID.hiring, "done", "accepted", "low", -6, -16),
    task("2416", "Compare relocation vendors", ID.noah, ID.hannah, ID.hannah, ID.office, "in_progress", "accepted", "medium", 9, -5),
    task("2417", "Review the contractor agreement", ID.omar, ID.anika, ID.anika, ID.pay, "todo", "pending_acceptance", "high", 3, -1),
    task("2419", "Task transition error states", ID.sofia, ID.priya, ID.priya, ID.hub, "in_review", "accepted", "high", 1, -3),
    task("2420", "Break tracking copy", ID.kabir, ID.priya, ID.priya, ID.hub, "in_review", "accepted", "low", 0, -2),
    task("2421", "Leave overlap warning", ID.meera, ID.priya, ID.priya, ID.hub, "in_progress", "accepted", "urgent", -1, -5),
    task("2422", "Dashboard greeting timezone", ID.meera, ID.priya, ID.priya, ID.hub, "changes_requested", "accepted", "medium", 2, -6),
  ].map((item) => ({
    ...item,
    project: projectRef(item.project_id),
    assignee: ref(employees, item.assignee_id),
    reporter: ref(employees, item.reporter_id)!,
    reviewer: ref(employees, item.reviewer_id),
  }));

  tasks.find((item) => item.key === "WH-2406")!.rejection_reason =
    "This overlaps the design-system work already assigned to Liam. Re-scope it or reassign it.";
  tasks.find((item) => item.key === "WH-2407")!.clarification_note =
    "Should the scorecard include contractors, or only full-time roles?";
  const blocked = tasks.find((item) => item.key === "WH-2408")!;
  blocked.blocked_from = "in_progress";
  blocked.block_reason = "Waiting on the identity provider sandbox credentials.";
  tasks.find((item) => item.key === "WH-2404")!.labels = ["attendance", "exceptions"];
  tasks.find((item) => item.key === "WH-2414")!.parent_id = "task_2413";
  tasks.find((item) => item.key === "WH-2413")!.labels = ["reports"];
  tasks.find((item) => item.key === "WH-2421")!.labels = ["leave"];

  function task(
    number: string,
    title: string,
    assignee: string,
    reporter: string,
    reviewer: string,
    project: string,
    status: Task["status"],
    assignment: Task["assignment_state"],
    priority: Task["priority"],
    due: number,
    created: number,
  ): Task {
    return {
      id: `task_${number}`,
      key: `WH-${number}`,
      title,
      description: `${title}. Capture the outcome, the owner, and any dependency before moving the status.`,
      project_id: project,
      project: { id: project, name: project },
      department_id: employees.find((item) => item.id === assignee)?.department_id ?? ID.eng,
      team_id: employees.find((item) => item.id === assignee)?.team_id ?? null,
      assignee_id: assignee,
      assignee: null,
      reporter_id: reporter,
      reporter: { id: reporter, name: reporter },
      reviewer_id: reviewer,
      reviewer: null,
      priority,
      status,
      assignment_state: assignment,
      rejection_reason: null,
      clarification_note: null,
      block_reason: null,
      blocked_from: null,
      start_date: shiftDate(created),
      due_date: shiftDate(due),
      labels: [],
      parent_id: null,
      attachments: [],
      created_at: stamp(created, "10:15"),
      updated_at: stamp(Math.min(due, -1), "16:40"),
    };
  }

  const comments: TaskComment[] = [
    {
      id: "cmt_1",
      task_id: "task_2404",
      author_id: ID.priya,
      author: ref(employees, ID.priya)!,
      body: "Please name the exception in the row, not only with colour. HR needs to scan the table.",
      created_at: stamp(-1, "11:20"),
    },
    {
      id: "cmt_2",
      task_id: "task_2401",
      author_id: ID.meera,
      author: ref(employees, ID.meera)!,
      body: "The clock button now waits for the server status before enabling the next action.",
      created_at: stamp(-1, "15:05"),
    },
  ];

  const events: TaskEvent[] = tasks.map((item) => ({
    id: `evt_${item.id}`,
    task_id: item.id,
    actor_id: item.reporter_id,
    actor: item.reporter,
    message: "created the task",
    created_at: item.created_at,
  }));
  events.push({
    id: "evt_reject_2406",
    task_id: "task_2406",
    actor_id: ID.sofia,
    actor: ref(employees, ID.sofia)!,
    message: "rejected the assignment: This overlaps the design-system work already assigned to Liam.",
    created_at: stamp(-2, "09:50"),
  });

  const leaveTypes: LeaveType[] = [
    { id: ID.annual, code: "AL", name: "Annual leave", description: "Planned time away, requested in advance.", requires_attachment: false, allow_partial_day: true },
    { id: ID.sick, code: "SL", name: "Sick leave", description: "Health-related absence. An attachment may be requested.", requires_attachment: false, allow_partial_day: true },
    { id: ID.casual, code: "CL", name: "Casual leave", description: "Short personal leave within the published balance.", requires_attachment: false, allow_partial_day: true },
  ];

  const allocations = employees.flatMap((employee) => [
    { employee_id: employee.id, leave_type_id: ID.annual, allocated_days: 18 },
    { employee_id: employee.id, leave_type_id: ID.sick, allocated_days: 10 },
    { employee_id: employee.id, leave_type_id: ID.casual, allocated_days: 6 },
  ]);

  const leave = (
    id: string,
    employeeId: string,
    typeId: string,
    start: number,
    end: number,
    status: LeaveRequest["status"],
    reason: string,
    comment: string | null,
  ): LeaveRequest => {
    const employee = employees.find((item) => item.id === employeeId)!;
    const type = leaveTypes.find((item) => item.id === typeId)!;
    const startDate = shiftDate(start);
    const endDate = shiftDate(end);
    return {
      id,
      employee_id: employeeId,
      employee: ref(employees, employeeId)!,
      department_id: employee.department_id,
      leave_type_id: typeId,
      leave_type_name: type.name,
      start_date: startDate,
      end_date: endDate,
      partial_day: "none",
      days: Math.max(1, end - start + 1 > 0 ? countWeekdays(startDate, endDate) : 1),
      reason,
      status,
      reviewer_comment: comment,
      created_at: stamp(start - 7, "09:00"),
      decided_at: status === "pending" ? null : stamp(start - 5, "14:00"),
      warnings: [],
    };
  };

  const leaveRequests: LeaveRequest[] = [
    leave("lv_meera_pending", ID.meera, ID.annual, 5, 7, "pending", "Family travel booked before this sprint was planned.", null),
    leave("lv_meera_sick", ID.meera, ID.sick, -20, -19, "approved", "Fever and a day to recover.", null),
    leave("lv_meera_rejected", ID.meera, ID.casual, -8, -8, "rejected", "Need the morning for a household repair.", "The team is at capacity that day. Please choose another date."),
    leave("lv_kabir_pending", ID.kabir, ID.sick, 1, 1, "pending", "Medical appointment that cannot be moved.", null),
    leave("lv_vikram", ID.vikram, ID.annual, -1, 3, "approved", "Annual leave already agreed with Priya.", null),
    leave("lv_sofia", ID.sofia, ID.casual, 2, 2, "approved", "Personal appointment.", null),
    leave("lv_noah", ID.noah, ID.annual, 10, 11, "pending", "Travel for a family event.", null),
  ];

  const corrections: Database["corrections"] = [
    {
      id: "cor_kabir",
      employee_id: ID.kabir,
      employee: ref(employees, ID.kabir)!,
      date: shiftDate(-1),
      requested_clock_in_at: stamp(-1, "09:40"),
      requested_clock_out_at: stamp(-1, "18:10"),
      reason: "I closed the laptop before clocking out after the incident bridge.",
      status: "pending",
      reviewer_comment: null,
      created_at: stamp(0, "08:40"),
      decided_at: null,
    },
    {
      id: "cor_meera",
      employee_id: ID.meera,
      employee: ref(employees, ID.meera)!,
      date: shiftDate(-6),
      requested_clock_in_at: stamp(-6, "09:35"),
      requested_clock_out_at: stamp(-6, "18:00"),
      reason: "The clock-out button failed while the network was down.",
      status: "approved",
      reviewer_comment: "Network incident confirmed.",
      created_at: stamp(-5, "10:00"),
      decided_at: stamp(-5, "16:00"),
    },
  ];

  const approvals: Approval[] = [
    approval("apr_meera_leave", "leave", "lv_meera_pending", ID.meera, "Annual leave · Meera Iyer", "5–7 working request for family travel.", [
      ["Type", "Annual leave"],
      ["Dates", `${shiftDate(5)} to ${shiftDate(7)}`],
      ["Balance impact", "Calculated when the decision is saved"],
    ]),
    approval("apr_kabir_leave", "leave", "lv_kabir_pending", ID.kabir, "Sick leave · Kabir Das", "One day for a medical appointment.", [
      ["Type", "Sick leave"],
      ["Date", shiftDate(1)],
    ]),
    approval("apr_noah_leave", "leave", "lv_noah_pending", ID.noah, "Annual leave · Noah Williams", "Two days for family travel.", [
      ["Type", "Annual leave"],
      ["Dates", `${shiftDate(10)} to ${shiftDate(11)}`],
    ]),
    approval("apr_kabir_att", "attendance_correction", "cor_kabir", ID.kabir, "Attendance correction · Kabir Das", "Missing clock-out after an incident bridge.", [
      ["Date", shiftDate(-1)],
      ["Requested clock-out", "18:10"],
    ]),
    approval("apr_liam_profile", "profile_change", "profile_liam", ID.liam, "Preferred name · Liam Chen", "Liam asked to display Lee Chen on the directory.", [
      ["Current", "Liam Chen"],
      ["Requested", "Lee Chen"],
    ]),
    approval("apr_noah_hr", "hr_request", "hr_monitor", ID.noah, "Equipment · Noah Williams", "Request for an external monitor at the Mumbai desk.", [
      ["Item", "27-inch monitor"],
      ["Location", "Mumbai"],
    ]),
  ];

  function approval(
    id: string,
    type: Approval["type"],
    subject: string,
    employeeId: string,
    title: string,
    summary: string,
    context: [string, string][],
  ): Approval {
    return {
      id,
      type,
      subject_id: subject,
      employee_id: employeeId,
      employee: ref(employees, employeeId)!,
      title,
      summary,
      status: "pending",
      submitted_at: stamp(-1, "09:30"),
      decided_at: null,
      decided_by: null,
      comment: null,
      context: context.map(([label, value]) => ({ label, value })),
      history: [
        { at: stamp(-1, "09:30"), actor: ref(employees, employeeId)!.name, message: "Submitted the request." },
      ],
    };
  }

  const notifications: Database["notifications"] = [
    note("nt_m1", ID.meera, "task", "New task assigned", "Daniel assigned WH-2410 Asset return workflow to you.", "/tasks/task_2410", false),
    note("nt_m2", ID.meera, "task", "Task due soon", "WH-2401 is due in two days.", "/tasks/task_2401", false),
    note("nt_m3", ID.meera, "task", "Changes requested", "Priya requested changes on WH-2422.", "/tasks/task_2422", false),
    note("nt_m4", ID.meera, "leave", "Leave rejected", "Your casual leave request was rejected.", "/leave/lv_meera_rejected", true),
    note("nt_p1", ID.priya, "task", "Review requested", "Sofia submitted WH-2419 for review.", "/tasks/task_2419", false),
    note("nt_p2", ID.priya, "approval", "Approval waiting", "Meera requested annual leave.", "/approvals/apr_meera_leave", false),
    note("nt_p3", ID.priya, "attendance", "Missing clock-out", "Kabir has no clock-out for yesterday.", "/attendance/manage", false),
    note("nt_r1", ID.rohan, "hr", "Invitation pending", "Grace Kim has not accepted her invitation.", "/employees/emp_grace", false),
    note("nt_r2", ID.rohan, "approval", "Profile change", "Liam Chen requested a preferred name.", "/approvals/apr_liam_profile", false),
    note("nt_h1", ID.hannah, "approval", "Team leave", "Noah Williams requested annual leave.", "/approvals/apr_noah_leave", false),
    note("nt_d1", ID.daniel, "task", "Review requested", "Liam submitted portal empty states.", "/tasks/task_2411", false),
  ];

  function note(
    id: string,
    recipient: string,
    category: Database["notifications"][number]["category"],
    title: string,
    body: string,
    href: string,
    read: boolean,
  ): Database["notifications"][number] {
    return {
      id,
      recipient_id: recipient,
      category,
      title,
      body,
      href,
      read_at: read ? stamp(-2, "12:00") : null,
      created_at: stamp(read ? -2 : -1, "08:15"),
    };
  }

  const attendance = buildAttendance(employees);

  const onboarding: OnboardingCase[] = [
    {
      id: "onb_grace",
      employee_id: ID.grace,
      employee: ref(employees, ID.grace)!,
      start_date: shiftDate(10),
      status: "in_progress",
      items: [
        { id: "onb_grace_1", label: "Send invitation", done: true, owner: "People" },
        { id: "onb_grace_2", label: "Prepare laptop", done: false, owner: "Operations" },
        { id: "onb_grace_3", label: "Add to Platform team", done: false, owner: "Engineering" },
        { id: "onb_grace_4", label: "Schedule first-week buddy", done: false, owner: "Priya Nair" },
      ],
    },
  ];

  const offboarding: OffboardingCase[] = [
    {
      id: "off_nico",
      employee_id: ID.nico,
      employee: ref(employees, ID.nico)!,
      last_day: shiftDate(-12),
      status: "completed",
      items: [
        { id: "off_nico_1", label: "Revoke access", done: true, owner: "IT" },
        { id: "off_nico_2", label: "Collect laptop", done: true, owner: "Operations" },
        { id: "off_nico_3", label: "Exit interview", done: true, owner: "People" },
      ],
    },
  ];

  const assets: Asset[] = [
    { id: "ast_1", name: "MacBook Pro 14", category: "Laptop", serial_number: "HX-MBP-1042", assigned_to: ID.priya, assignee: ref(employees, ID.priya), status: "assigned" },
    { id: "ast_2", name: "MacBook Pro 14", category: "Laptop", serial_number: "HX-MBP-1188", assigned_to: ID.meera, assignee: ref(employees, ID.meera), status: "assigned" },
    { id: "ast_3", name: "ThinkPad T14", category: "Laptop", serial_number: "HX-TP-1194", assigned_to: ID.kabir, assignee: ref(employees, ID.kabir), status: "assigned" },
    { id: "ast_4", name: "Dell 27 monitor", category: "Display", serial_number: "HX-MON-014", assigned_to: null, assignee: null, status: "available" },
    { id: "ast_5", name: "MacBook Pro 14", category: "Laptop", serial_number: "HX-MBP-0904", assigned_to: null, assignee: null, status: "retired" },
  ];

  return {
    version: DB_VERSION,
    organisation: {
      name: "Helios Industries",
      legal_name: "Helios Industries Pvt Ltd",
      timezone: "Asia/Kolkata",
      work_week: [1, 2, 3, 4, 5],
      standard_start: "09:30",
      breaks_enabled: true,
      date_format: "dd MMM yyyy",
    },
    departments,
    teams,
    accounts,
    employees,
    projects,
    tasks,
    comments,
    events,
    attendance,
    breaks: [],
    corrections,
    leaveTypes,
    allocations,
    leaveRequests,
    approvals,
    notifications,
    preferences: {
      email_enabled: true,
      in_app_enabled: true,
      categories: {
        task: true,
        leave: true,
        attendance: true,
        approval: true,
        hr: true,
        system: true,
      },
    },
    audit: [
      { id: "aud_1", actor_id: ID.rohan, actor_name: "Rohan Mehta", action: "Invited employee", target: "Grace Kim", created_at: stamp(-2, "11:00") },
      { id: "aud_2", actor_id: ID.priya, actor_name: "Priya Nair", action: "Approved leave", target: "Vikram Patel", created_at: stamp(-4, "15:10") },
      { id: "aud_3", actor_id: ID.anika, actor_name: "Anika Shah", action: "Updated organisation timezone", target: "Asia/Kolkata", created_at: stamp(-12, "09:00") },
      { id: "aud_4", actor_id: ID.hannah, actor_name: "Hannah Brooks", action: "Completed offboarding", target: "Nico Rossi", created_at: stamp(-12, "17:30") },
      { id: "aud_5", actor_id: ID.meera, actor_name: "Meera Iyer", action: "Submitted task for review", target: "WH-2409", created_at: stamp(-4, "18:05") },
    ],
    onboarding,
    offboarding,
    assets,
    sequence: 5000,
  };
}

function countWeekdays(start: string, end: string) {
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  let days = 0;
  while (cursor <= last) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) days += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function buildAttendance(employees: Employee[]): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const active = employees.filter((employee) => employee.status === "active" || employee.status === "on_leave");
  for (const employee of active) {
    for (let offset = -12; offset <= -1; offset += 1) {
      const date = shiftDate(offset);
      const weekday = new Date(`${date}T00:00:00`).getDay();
      if (weekday === 0 || weekday === 6) continue;
      const onLeave =
        employee.id === ID.vikram && offset >= -1 && offset <= 3;
      if (onLeave) {
        records.push(record(employee, date, null, null, "leave", []));
        continue;
      }
      if (employee.id === ID.kabir && offset === -1) {
        records.push(
          record(employee, date, "09:40", null, "partial", ["Missing clock-out"]),
        );
        continue;
      }
      const late = Math.abs(offset) % 5 === 0;
      records.push(
        record(
          employee,
          date,
          late ? "10:12" : "09:22",
          "18:06",
          late ? "late" : "present",
          late ? ["Late arrival"] : [],
        ),
      );
    }
  }
  return records;
}

function record(
  employee: Employee,
  date: string,
  clockIn: string | null,
  clockOut: string | null,
  status: AttendanceRecord["status"],
  exceptions: string[],
): AttendanceRecord {
  const clock_in_at = clockIn ? dateTimeInTimeZone(date, clockIn) : null;
  const clock_out_at = clockOut ? dateTimeInTimeZone(date, clockOut) : null;
  const worked =
    clock_in_at && clock_out_at
      ? Math.round(
          (new Date(clock_out_at).getTime() - new Date(clock_in_at).getTime()) /
            60000,
        )
      : 0;
  return {
    id: `att_${employee.id}_${date}`,
    employee_id: employee.id,
    employee: {
      id: employee.id,
      name: personName(employee),
      job_title: employee.job_title,
    },
    department_id: employee.department_id,
    date,
    clock_in_at,
    clock_out_at,
    break_minutes: clockOut ? 30 : 0,
    worked_minutes: Math.max(0, worked - (clockOut ? 30 : 0)),
    status,
    exceptions,
    timezone: "Asia/Kolkata",
  };
}
