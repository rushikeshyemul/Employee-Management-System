"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader, PreviewBanner, QueryBoundary } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-provider";
import { isDemoMode } from "@/lib/demo-mode";
import { employeeService, lifecycleService, organisationService, taskService } from "@/lib/api/services";
import { errorMessage } from "@/lib/api/errors";
import { formatDateOnly, formatDateTime, personName, titleCase } from "@/lib/format";
import { hasPermission, ROLE_PERMISSIONS } from "@/lib/permissions";
import { PERMISSIONS, type Role } from "@/types";

function Proposed({ children }: { children: ReactNode }) {
  return (
    <PreviewBanner title="Proposed module">
      {children} {isDemoMode() ? "The records below are demo data stored in this browser." : "API mode calls the documented path and shows the server result. It does not invent a successful save."}
    </PreviewBanner>
  );
}

export function ProjectsScreen() {
  const { permissions } = useAuth();
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => organisationService.projects() });
  const departments = useQuery({ queryKey: ["departments"], queryFn: () => organisationService.departments() });
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: () => organisationService.saveProject({
      name,
      key,
      description: "",
      status: "active",
      department_id: departmentId || departments.data?.[0]?.id || "",
      lead_id: null,
    }),
    onSuccess: async () => {
      toast.success("Project created.");
      setName("");
      setKey("");
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <div>
      <PageHeader title="Projects" description="Projects group tasks. Creating a project requires the documented projects endpoint." />
      <QueryBoundary isPending={projects.isPending} isError={projects.isError} error={projects.error} data={projects.data} onRetry={() => void projects.refetch()} isEmpty={!projects.data?.length} empty={<p className="text-sm text-muted-foreground">No projects yet.</p>}>
        {(items) => (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="rounded-xl border bg-card p-4 hover:bg-muted/40">
                <p className="font-mono text-xs text-muted-foreground">{project.key}</p>
                <h2 className="font-medium">{project.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
                <p className="mt-2 text-xs">{titleCase(project.status)}</p>
              </Link>
            ))}
          </div>
        )}
      </QueryBoundary>
      {hasPermission(permissions, "projects.manage") ? (
        <form className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border bg-card p-4" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
          <label className="grid gap-1 text-sm">Key<Input value={key} onChange={(event) => setKey(event.target.value.toUpperCase())} required /></label>
          <label className="grid gap-1 text-sm">Name<Input value={name} onChange={(event) => setName(event.target.value)} required /></label>
          <label className="grid gap-1 text-sm">Department
            <select className="h-8 rounded-lg border bg-card px-2" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} required>
              <option value="">Select</option>
              {departments.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <Button type="submit" disabled={create.isPending}>Create project</Button>
        </form>
      ) : null}
    </div>
  );
}

export function ProjectDetailScreen() {
  const params = useParams<{ id: string }>();
  const project = useQuery({ queryKey: ["projects", params.id], queryFn: () => organisationService.project(params.id) });
  const tasks = useQuery({ queryKey: ["tasks", "project", params.id], queryFn: () => taskService.list({ project: params.id, page_size: 50 }) });
  return (
    <QueryBoundary isPending={project.isPending} isError={project.isError} error={project.error} data={project.data} onRetry={() => void project.refetch()}>
      {(item) => (
        <div>
          <PageHeader title={item.name} description={item.description} meta={<span className="font-mono">{item.key}</span>} />
          <div className="grid gap-2">
            {tasks.data?.results.map((task) => (
              <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm hover:bg-muted/40">
                <span>{task.key} {task.title}</span>
                <span>{titleCase(task.status)}</span>
              </Link>
            ))}
            {tasks.data?.results.length === 0 ? <p className="text-sm text-muted-foreground">No tasks in this project.</p> : null}
          </div>
        </div>
      )}
    </QueryBoundary>
  );
}

export function DepartmentsScreen() {
  const { permissions } = useAuth();
  const departments = useQuery({ queryKey: ["departments"], queryFn: () => organisationService.departments() });
  const teams = useQuery({ queryKey: ["teams"], queryFn: () => organisationService.teams() });
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: () => organisationService.createDepartment({ name, code }),
    onSuccess: async () => {
      toast.success("Department created.");
      setName("");
      setCode("");
      await queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <div className="space-y-4">
      <PageHeader title="Departments and teams" description="Structure used by employee records, reports, and task filters." />
      <QueryBoundary isPending={departments.isPending} isError={departments.isError} error={departments.error} data={departments.data} onRetry={() => void departments.refetch()}>
        {(items) => (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((department) => (
              <section key={department.id} className="rounded-xl border bg-card p-4">
                <h2 className="font-medium">{department.name}</h2>
                <p className="text-xs text-muted-foreground">{department.code}</p>
                <ul className="mt-2 text-sm">
                  {teams.data?.filter((team) => team.department_id === department.id).map((team) => (
                    <li key={team.id}><Link className="hover:underline" href={`/teams/${team.id}`}>{team.name}</Link></li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </QueryBoundary>
      {hasPermission(permissions, "departments.manage") ? (
        <form className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-4" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
          <label className="grid gap-1 text-sm">Code<Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required /></label>
          <label className="grid gap-1 text-sm">Name<Input value={name} onChange={(event) => setName(event.target.value)} required /></label>
          <Button type="submit" disabled={create.isPending}>Add department</Button>
        </form>
      ) : null}
    </div>
  );
}

export function TeamScreen() {
  const params = useParams<{ id: string }>();
  const teams = useQuery({ queryKey: ["teams"], queryFn: () => organisationService.teams() });
  const people = useQuery({
    queryKey: ["employees", "team", params.id],
    queryFn: () => employeeService.list({ team: params.id, page_size: 50 }),
    enabled: Boolean(params.id),
  });
  const team = teams.data?.find((item) => item.id === params.id);
  return (
    <QueryBoundary isPending={teams.isPending || people.isPending} isError={teams.isError || people.isError} error={teams.error ?? people.error} data={team} onRetry={() => { void teams.refetch(); void people.refetch(); }}>
      {(item) => (
        <div>
          <PageHeader title={item.name} description={item.description || "Team members come from employee records."} />
          <ul className="space-y-2">
            {people.data?.results.map((member) => (
              <li key={member.id} className="rounded-lg border bg-card px-3 py-2 text-sm">{personName(member)} · {member.job_title}</li>
            ))}
            {people.data?.results.length === 0 ? <li className="text-sm text-muted-foreground">No visible members.</li> : null}
          </ul>
        </div>
      )}
    </QueryBoundary>
  );
}

export function SettingsScreen() {
  const { permissions } = useAuth();
  const query = useQuery({ queryKey: ["settings"], queryFn: () => organisationService.settings() });
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: organisationService.updateSettings,
    onSuccess: async () => {
      toast.success("Organisation settings saved.");
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const canEdit = hasPermission(permissions, "settings.manage");
  return (
    <div>
      <PageHeader title="Organisation settings" description="Timezone and work week used when the interface formats dates. Official records still come from the API." />
      <Proposed>PATCH /organisation/settings/ is proposed and not yet confirmed.</Proposed>
      <QueryBoundary isPending={query.isPending} isError={query.isError} error={query.error} data={query.data} onRetry={() => void query.refetch()}>
        {(settings) => (
          <form className="mt-4 grid max-w-lg gap-3" onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            save.mutate({
              name: String(data.get("name") ?? ""),
              legal_name: String(data.get("legal_name") ?? ""),
              timezone: String(data.get("timezone") ?? ""),
              standard_start: String(data.get("standard_start") ?? ""),
              breaks_enabled: data.get("breaks_enabled") === "on",
            });
          }}>
            <label className="grid gap-1 text-sm">Name<Input name="name" defaultValue={settings.name} disabled={!canEdit} /></label>
            <label className="grid gap-1 text-sm">Legal name<Input name="legal_name" defaultValue={settings.legal_name} disabled={!canEdit} /></label>
            <label className="grid gap-1 text-sm">Timezone<Input name="timezone" defaultValue={settings.timezone} disabled={!canEdit} /></label>
            <label className="grid gap-1 text-sm">Standard start<Input name="standard_start" defaultValue={settings.standard_start} disabled={!canEdit} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="breaks_enabled" defaultChecked={settings.breaks_enabled} disabled={!canEdit} /> Breaks enabled</label>
            <p className="text-xs text-muted-foreground">Work week: {settings.work_week.map((day) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]).join(", ")}</p>
            {canEdit ? <Button type="submit" disabled={save.isPending}>Save settings</Button> : <p className="text-sm text-muted-foreground">You can view these settings. Editing requires settings.manage.</p>}
          </form>
        )}
      </QueryBoundary>
    </div>
  );
}

const ROLES: Role[] = ["employee", "project_manager", "manager", "hr_admin", "super_admin"];

export function RolesScreen() {
  return (
    <div>
      <PageHeader title="Roles and permissions" description="This matrix is the frontend default used when the API omits a permission list. Editing roles is unavailable until the backend exposes a confirmed permissions API." />
      <PreviewBanner title="Read only">Role changes are not sent anywhere. Backend authorization remains the source of truth.</PreviewBanner>
      <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-xs">
          <caption className="sr-only">Permission matrix</caption>
          <thead className="border-b">
            <tr>
              <th className="p-2 text-left font-medium">Permission</th>
              {ROLES.map((role) => <th key={role} className="p-2 text-left font-medium">{titleCase(role)}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((permission) => (
              <tr key={permission} className="border-b last:border-0">
                <th className="p-2 text-left font-normal">{permission}</th>
                {ROLES.map((role) => <td key={role} className="p-2">{ROLE_PERMISSIONS[role].includes(permission) ? "Yes" : "—"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AuditScreen() {
  const query = useQuery({ queryKey: ["audit"], queryFn: () => lifecycleService.audit({ page_size: 50 }) });
  return (
    <div>
      <PageHeader title="Audit log" description="A read-only trail of consequential actions." />
      <Proposed>GET /audit-logs/ is proposed.</Proposed>
      <div className="mt-4">
        <QueryBoundary isPending={query.isPending} isError={query.isError} error={query.error} data={query.data} onRetry={() => void query.refetch()} isEmpty={!query.data?.results.length} empty={<p className="text-sm text-muted-foreground">No audit events.</p>}>
          {(data) => (
            <ul className="divide-y rounded-xl border bg-card">
              {data.results.map((event) => (
                <li key={event.id} className="px-3 py-2 text-sm">
                  <span className="font-medium">{event.actor_name}</span> {event.action} · {event.target}
                  <span className="ml-2 text-xs text-muted-foreground">{formatDateTime(event.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </QueryBoundary>
      </div>
    </div>
  );
}

export function OnboardingScreen() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["onboarding"], queryFn: () => lifecycleService.onboarding() });
  const toggle = useMutation({
    mutationFn: ({ caseId, itemId }: { caseId: string; itemId: string }) => lifecycleService.toggleOnboarding(caseId, itemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <div>
      <PageHeader title="Onboarding" description="Checklist progress for new joiners." />
      <Proposed>POST /onboarding/{"{id}"}/items/{"{itemId}"}/ is proposed.</Proposed>
      <div className="mt-4 space-y-3">
        <QueryBoundary isPending={query.isPending} isError={query.isError} error={query.error} data={query.data} onRetry={() => void query.refetch()}>
          {(cases) => cases.map((item) => (
            <section key={item.id} className="rounded-xl border bg-card p-4">
              <h2 className="font-medium">{item.employee.name}</h2>
              <p className="text-xs text-muted-foreground">Starts {formatDateOnly(item.start_date)} · {titleCase(item.status)}</p>
              <ul className="mt-2 space-y-1">
                {item.items.map((check) => (
                  <li key={check.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={check.done} onChange={() => toggle.mutate({ caseId: item.id, itemId: check.id })} />
                      {check.label} <span className="text-xs text-muted-foreground">{check.owner}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </QueryBoundary>
      </div>
    </div>
  );
}

export function OffboardingScreen() {
  const query = useQuery({ queryKey: ["offboarding"], queryFn: () => lifecycleService.offboarding() });
  return (
    <div>
      <PageHeader title="Offboarding" description="Checklist for people leaving the organisation. Completion updates are not available until the backend confirms a write endpoint." />
      <Proposed>GET /offboarding/ is proposed. Item completion is view-only.</Proposed>
      <div className="mt-4">
        <QueryBoundary isPending={query.isPending} isError={query.isError} error={query.error} data={query.data} onRetry={() => void query.refetch()}>
          {(cases) => cases.map((item) => (
            <section key={item.id} className="rounded-xl border bg-card p-4">
              <h2 className="font-medium">{item.employee.name}</h2>
              <p className="text-xs text-muted-foreground">Last day {formatDateOnly(item.last_day)}</p>
              <ul className="mt-2 text-sm">{item.items.map((check) => <li key={check.id}>{check.done ? "Done" : "Open"} · {check.label}</li>)}</ul>
            </section>
          ))}
        </QueryBoundary>
      </div>
    </div>
  );
}

export function AssetsScreen() {
  const query = useQuery({ queryKey: ["assets"], queryFn: () => lifecycleService.assets() });
  return (
    <div>
      <PageHeader title="Assets" description="Equipment assigned to employees. Assignment changes go through an HR request in the approval centre." />
      <Proposed>GET /assets/ is proposed. Assignment is not edited on this screen.</Proposed>
      <div className="mt-4">
        <QueryBoundary isPending={query.isPending} isError={query.isError} error={query.error} data={query.data} onRetry={() => void query.refetch()} isEmpty={!query.data?.length} empty={<p className="text-sm text-muted-foreground">No assets.</p>}>
          {(assets) => (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-sm">
                <caption className="sr-only">Assets</caption>
                <thead className="border-b text-left text-xs text-muted-foreground"><tr><th className="p-3">Name</th><th className="p-3">Serial</th><th className="p-3">Assignee</th><th className="p-3">Status</th></tr></thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.id} className="border-b last:border-0">
                      <td className="p-3">{asset.name}</td>
                      <td className="p-3 font-mono text-xs">{asset.serial_number}</td>
                      <td className="p-3">{asset.assignee?.name ?? "Unassigned"}</td>
                      <td className="p-3">{titleCase(asset.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryBoundary>
      </div>
    </div>
  );
}
