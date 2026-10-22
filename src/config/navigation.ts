import type { Permission } from "@/types";
import { hasPermission } from "@/lib/permissions";

export type NavIconName =
  | "overview"
  | "tasks"
  | "projects"
  | "attendance"
  | "leave"
  | "notifications"
  | "profile"
  | "board"
  | "review"
  | "approvals"
  | "calendar"
  | "reports"
  | "employees"
  | "teams"
  | "onboarding"
  | "offboarding"
  | "assets"
  | "audit"
  | "roles"
  | "settings";

export type NavSectionId = "workspace" | "team" | "organisation";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
  section: NavSectionId;
  isVisible: (permissions: readonly Permission[]) => boolean;
  isActive: (pathname: string) => boolean;
}

export const NAV_SECTIONS: { id: NavSectionId; label: string }[] = [
  { id: "workspace", label: "Workspace" },
  { id: "team", label: "Team" },
  { id: "organisation", label: "Organisation" },
];

function exact(pathname: string, href: string) {
  return pathname === href;
}

function nested(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function org(permissions: readonly Permission[]) {
  return hasPermission(permissions, "reports.view_org");
}

export function overviewLabel(permissions: readonly Permission[]) {
  if (org(permissions)) return "Organisation Dashboard";
  if (hasPermission(permissions, "reports.view_team")) return "Team Overview";
  return "Overview";
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: "overview",
    section: "workspace",
    isVisible: (permissions) => hasPermission(permissions, "dashboard.view"),
    isActive: (pathname) => exact(pathname, "/dashboard"),
  },
  {
    href: "/tasks",
    label: "My Tasks",
    icon: "tasks",
    section: "workspace",
    isVisible: (permissions) => hasPermission(permissions, "tasks.view_own"),
    isActive: (pathname) =>
      nested(pathname, "/tasks") &&
      !nested(pathname, "/tasks/board") &&
      !nested(pathname, "/tasks/review"),
  },
  {
    href: "/projects",
    label: "Projects",
    icon: "projects",
    section: "workspace",
    isVisible: (permissions) => hasPermission(permissions, "projects.view"),
    isActive: (pathname) => nested(pathname, "/projects"),
  },
  {
    href: "/attendance",
    label: "Attendance",
    icon: "attendance",
    section: "workspace",
    isVisible: (permissions) => hasPermission(permissions, "attendance.view_own"),
    isActive: (pathname) =>
      nested(pathname, "/attendance") &&
      !nested(pathname, "/attendance/manage") &&
      !nested(pathname, "/attendance/corrections"),
  },
  {
    href: "/leave",
    label: "Leave & Requests",
    icon: "leave",
    section: "workspace",
    isVisible: (permissions) => hasPermission(permissions, "leave.view_own"),
    isActive: (pathname) =>
      (pathname === "/leave" || pathname.startsWith("/leave/")) &&
      !nested(pathname, "/leave/manage") &&
      !nested(pathname, "/leave/team") &&
      pathname !== "/leave/calendar",
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: "notifications",
    section: "workspace",
    isVisible: (permissions) => hasPermission(permissions, "notifications.view"),
    isActive: (pathname) => nested(pathname, "/notifications"),
  },
  {
    href: "/profile",
    label: "My Profile",
    icon: "profile",
    section: "workspace",
    isVisible: (permissions) => hasPermission(permissions, "profile.view"),
    isActive: (pathname) => exact(pathname, "/profile"),
  },
  {
    href: "/tasks/board",
    label: "Team Board",
    icon: "board",
    section: "team",
    isVisible: (permissions) =>
      !org(permissions) &&
      (hasPermission(permissions, "tasks.view_team") ||
        hasPermission(permissions, "tasks.view_all")),
    isActive: (pathname) => nested(pathname, "/tasks/board"),
  },
  {
    href: "/tasks/review",
    label: "Review Queue",
    icon: "review",
    section: "team",
    isVisible: (permissions) =>
      !org(permissions) && hasPermission(permissions, "tasks.review"),
    isActive: (pathname) => nested(pathname, "/tasks/review"),
  },
  {
    href: "/approvals",
    label: "Approval Centre",
    icon: "approvals",
    section: "team",
    isVisible: (permissions) =>
      !org(permissions) && hasPermission(permissions, "approvals.view"),
    isActive: (pathname) => nested(pathname, "/approvals"),
  },
  {
    href: "/leave/team",
    label: "Team Calendar",
    icon: "calendar",
    section: "team",
    isVisible: (permissions) =>
      !org(permissions) && hasPermission(permissions, "leave.view_team"),
    isActive: (pathname) => nested(pathname, "/leave/team"),
  },
  {
    href: "/reports",
    label: "Team Reports",
    icon: "reports",
    section: "team",
    isVisible: (permissions) =>
      !org(permissions) && hasPermission(permissions, "reports.view_team"),
    isActive: (pathname) => nested(pathname, "/reports"),
  },
  {
    href: "/employees",
    label: "Employees",
    icon: "employees",
    section: "organisation",
    isVisible: (permissions) => hasPermission(permissions, "employees.view"),
    isActive: (pathname) => nested(pathname, "/employees"),
  },
  {
    href: "/departments",
    label: "Departments & Teams",
    icon: "teams",
    section: "organisation",
    isVisible: (permissions) => hasPermission(permissions, "departments.view"),
    isActive: (pathname) =>
      nested(pathname, "/departments") || nested(pathname, "/teams"),
  },
  {
    href: "/tasks/board",
    label: "Projects & Tasks",
    icon: "board",
    section: "organisation",
    isVisible: (permissions) =>
      org(permissions) && hasPermission(permissions, "tasks.view_all"),
    isActive: (pathname) => nested(pathname, "/tasks/board"),
  },
  {
    href: "/tasks/review",
    label: "Review Queue",
    icon: "review",
    section: "organisation",
    isVisible: (permissions) =>
      org(permissions) && hasPermission(permissions, "tasks.review"),
    isActive: (pathname) => nested(pathname, "/tasks/review"),
  },
  {
    href: "/attendance/manage",
    label: "Attendance Management",
    icon: "attendance",
    section: "organisation",
    isVisible: (permissions) => hasPermission(permissions, "attendance.manage"),
    isActive: (pathname) =>
      nested(pathname, "/attendance/manage") ||
      nested(pathname, "/attendance/corrections"),
  },
  {
    href: "/leave/manage",
    label: "Leave Management",
    icon: "leave",
    section: "organisation",
    isVisible: (permissions) => hasPermission(permissions, "leave.manage"),
    isActive: (pathname) => nested(pathname, "/leave/manage"),
  },
  {
    href: "/approvals",
    label: "Approval Centre",
    icon: "approvals",
    section: "organisation",
    isVisible: (permissions) =>
      org(permissions) && hasPermission(permissions, "approvals.view"),
    isActive: (pathname) => nested(pathname, "/approvals"),
  },
  {
    href: "/reports",
    label: "Reports & Analytics",
    icon: "reports",
    section: "organisation",
    isVisible: (permissions) => hasPermission(permissions, "reports.view_org"),
    isActive: (pathname) => nested(pathname, "/reports"),
  },
  {
    href: "/onboarding",
    label: "Onboarding",
    icon: "onboarding",
    section: "organisation",
    isVisible: (permissions) => hasPermission(permissions, "onboarding.view"),
    isActive: (pathname) => nested(pathname, "/onboarding"),
  },
  {
    href: "/offboarding",
    label: "Offboarding",
    icon: "offboarding",
    section: "organisation",
    isVisible: (permissions) => hasPermission(permissions, "onboarding.view"),
    isActive: (pathname) => nested(pathname, "/offboarding"),
  },
  {
    href: "/assets",
    label: "Assets",
    icon: "assets",
    section: "organisation",
    isVisible: (permissions) => hasPermission(permissions, "onboarding.view"),
    isActive: (pathname) => nested(pathname, "/assets"),
  },
  {
    href: "/audit",
    label: "Audit Logs",
    icon: "audit",
    section: "organisation",
    isVisible: (permissions) => hasPermission(permissions, "audit.view"),
    isActive: (pathname) => nested(pathname, "/audit"),
  },
  {
    href: "/settings/roles",
    label: "Roles & Permissions",
    icon: "roles",
    section: "organisation",
    isVisible: (permissions) => hasPermission(permissions, "roles.view"),
    isActive: (pathname) => nested(pathname, "/settings/roles"),
  },
  {
    href: "/settings",
    label: "Organisation Settings",
    icon: "settings",
    section: "organisation",
    isVisible: (permissions) => hasPermission(permissions, "settings.view"),
    isActive: (pathname) =>
      nested(pathname, "/settings") && !nested(pathname, "/settings/roles"),
  },
];

export function visibleNavigation(permissions: readonly Permission[]) {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: NAV_ITEMS.filter(
      (item) => item.section === section.id && item.isVisible(permissions),
    ).map((item) =>
      item.href === "/dashboard"
        ? { ...item, label: overviewLabel(permissions) }
        : item,
    ),
  })).filter((section) => section.items.length > 0);
}
