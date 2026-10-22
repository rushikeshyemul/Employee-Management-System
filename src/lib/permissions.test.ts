import { describe, expect, it } from "vitest";
import { visibleNavigation } from "@/config/navigation";
import { ROLE_PERMISSIONS, canAccessPath } from "@/lib/permissions";

describe("role navigation", () => {
  it("hides the employee directory from an employee", () => {
    const permissions = ROLE_PERMISSIONS.employee;
    expect(canAccessPath("/employees", permissions)).toBe(false);
    expect(canAccessPath("/dashboard", permissions)).toBe(true);
    expect(canAccessPath("/tasks", permissions)).toBe(true);
    const labels = visibleNavigation(permissions).flatMap((section) => section.items.map((item) => item.label));
    expect(labels).toContain("My Tasks");
    expect(labels).not.toContain("Employees");
    expect(labels).not.toContain("Approval Centre");
  });

  it("gives a manager the team board and approval centre", () => {
    const labels = visibleNavigation(ROLE_PERMISSIONS.manager).flatMap((section) => section.items.map((item) => item.label));
    expect(labels).toContain("Team Board");
    expect(labels).toContain("Approval Centre");
    expect(labels).not.toContain("Employees");
  });

  it("gives HR the organisation directory and does not duplicate the team section", () => {
    const sections = visibleNavigation(ROLE_PERMISSIONS.hr_admin);
    expect(sections.map((section) => section.id)).not.toContain("team");
    const labels = sections.flatMap((section) => section.items.map((item) => item.label));
    expect(labels).toContain("Organisation Dashboard");
    expect(labels).toContain("Employees");
    expect(labels).toContain("Approval Centre");
  });
});
