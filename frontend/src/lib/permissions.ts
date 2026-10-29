import {
  PERMISSIONS,
  type Permission,
  type Role,
} from "@/types";

export const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

const employeePermissions = [
  "dashboard.view",
  "tasks.view_own",
  "tasks.transition_own",
  "tasks.comment",
  "projects.view",
  "attendance.view_own",
  "attendance.clock",
  "attendance.request_correction",
  "leave.view_own",
  "leave.request",
  "notifications.view",
  "profile.view",
  "profile.edit_self",
] as const satisfies readonly Permission[];

const projectManagerPermissions = [
  ...employeePermissions,
  "tasks.view_all",
  "tasks.create",
  "tasks.assign",
  "tasks.review",
  "projects.manage",
  "reports.view_team",
] as const satisfies readonly Permission[];

const managerPermissions = [
  ...employeePermissions,
  "tasks.view_team",
  "tasks.create",
  "tasks.assign",
  "tasks.review",
  "attendance.view_team",
  "leave.view_team",
  "leave.approve",
  "approvals.view",
  "approvals.decide",
  "reports.view_team",
  "employees.view_team",
] as const satisfies readonly Permission[];

const hrPermissions = [
  ...managerPermissions,
  "tasks.view_all",
  "projects.manage",
  "attendance.manage",
  "leave.manage",
  "employees.view",
  "employees.manage",
  "employees.deactivate",
  "employees.view_sensitive",
  "reports.view_org",
  "departments.view",
  "departments.manage",
  "onboarding.view",
  "settings.view",
  "settings.manage",
  "audit.view",
  "roles.view",
] as const satisfies readonly Permission[];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  employee: employeePermissions,
  project_manager: projectManagerPermissions,
  manager: managerPermissions,
  hr_admin: hrPermissions,
  super_admin: ALL_PERMISSIONS,
};

export function hasPermission(
  permissions: readonly Permission[] | undefined,
  permission: Permission,
) {
  return permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(
  permissions: readonly Permission[] | undefined,
  required: readonly Permission[],
) {
  return required.some((permission) => hasPermission(permissions, permission));
}

const ROUTE_GUARDS: { prefix: string; anyOf: readonly Permission[] }[] = [
  { prefix: "/tasks/board", anyOf: ["tasks.view_team", "tasks.view_all"] },
  { prefix: "/tasks/review", anyOf: ["tasks.review"] },
  { prefix: "/tasks", anyOf: ["tasks.view_own", "tasks.view_team", "tasks.view_all", "tasks.create"] },
  { prefix: "/projects", anyOf: ["projects.view"] },
  { prefix: "/employees", anyOf: ["employees.view"] },
  { prefix: "/teams", anyOf: ["employees.view_team", "departments.view"] },
  { prefix: "/departments", anyOf: ["departments.view"] },
  { prefix: "/attendance/manage", anyOf: ["attendance.manage"] },
  {
    prefix: "/attendance/corrections",
    anyOf: [
      "attendance.request_correction",
      "attendance.manage",
      "attendance.view_team",
    ],
  },
  { prefix: "/attendance", anyOf: ["attendance.view_own"] },
  { prefix: "/leave/manage", anyOf: ["leave.manage"] },
  { prefix: "/leave/team", anyOf: ["leave.view_team", "leave.manage"] },
  { prefix: "/leave", anyOf: ["leave.view_own"] },
  { prefix: "/approvals", anyOf: ["approvals.view"] },
  { prefix: "/reports", anyOf: ["reports.view_team", "reports.view_org"] },
  { prefix: "/onboarding", anyOf: ["onboarding.view"] },
  { prefix: "/offboarding", anyOf: ["onboarding.view"] },
  { prefix: "/assets", anyOf: ["onboarding.view"] },
  { prefix: "/settings/roles", anyOf: ["roles.view"] },
  { prefix: "/settings", anyOf: ["settings.view"] },
  { prefix: "/audit", anyOf: ["audit.view"] },
  { prefix: "/notifications", anyOf: ["notifications.view"] },
  { prefix: "/profile", anyOf: ["profile.view"] },
  { prefix: "/dashboard", anyOf: ["dashboard.view"] },
];

export function canAccessPath(
  pathname: string,
  permissions: readonly Permission[] | undefined,
) {
  const guard = ROUTE_GUARDS.find(
    (item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`),
  );
  if (!guard) return true;
  return hasAnyPermission(permissions, guard.anyOf);
}

export function permissionFallback(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
