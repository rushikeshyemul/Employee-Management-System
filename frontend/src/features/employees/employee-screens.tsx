"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EmploymentBadge, RequestStatusBadge, StatusBadge } from "@/components/shared/badges";
import { PageHeader, QueryBoundary } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/features/auth/auth-provider";
import { useUrlState } from "@/hooks/use-url-state";
import { attendanceService, employeeService, leaveService, organisationService, taskService } from "@/lib/api/services";
import { errorMessage } from "@/lib/api/errors";
import { formatDateOnly, personName, titleCase } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { isDemoMode } from "@/lib/demo-mode";
import { employeeSchema, profileSchema } from "@/lib/validation";
import type { Employee } from "@/types";

export function EmployeesScreen() {
  const { permissions } = useAuth();
  const { get, setParams, page } = useUrlState();
  const [grid, setGrid] = useState(false);
  const departments = useQuery({ queryKey: ["departments"], queryFn: () => organisationService.departments() });
  const query = useQuery({
    queryKey: ["employees", { page, search: get("search"), department: get("department"), status: get("status"), location: get("location"), type: get("type") }],
    queryFn: () => employeeService.list({
      page,
      page_size: 12,
      search: get("search") || undefined,
      department: get("department") || undefined,
      status: get("status") || undefined,
      location: get("location") || undefined,
      employment_type: get("type") || undefined,
    }),
  });

  function exportCsv() {
    const rows = query.data?.results ?? [];
    const header = ["employee_code", "first_name", "last_name", "email", "job_title", "location", "status"];
    const body = rows.map((employee) => [employee.employee_code, employee.first_name, employee.last_name, employee.email, employee.job_title, employee.location, employee.status].join(","));
    const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employees-demo.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Directory of people you are allowed to see. Sensitive fields stay on the profile and only for authorised roles."
        actions={
          <>
            <Button variant="outline" onClick={() => setGrid((value) => !value)}>{grid ? "Table view" : "Grid view"}</Button>
            {isDemoMode() ? <Button variant="outline" onClick={exportCsv}>Export current page</Button> : <Button variant="outline" disabled title="Waiting for a confirmed CSV endpoint">Export unavailable</Button>}
            {hasPermission(permissions, "employees.manage") ? <Button nativeButton={false} render={<Link href="/employees/new" />}>Add employee</Button> : null}
          </>
        }
      />
      <div className="mb-4 grid gap-2 md:grid-cols-4">
        <Input aria-label="Search employees" placeholder="Search name or email" defaultValue={get("search")} onChange={(event) => {
          const value = event.target.value;
          window.clearTimeout(window.employeeSearchTimer);
          window.employeeSearchTimer = window.setTimeout(() => setParams({ search: value || null }), 300);
        }} />
        <NativeSelect label="Department" value={get("department")} onChange={(value) => setParams({ department: value || null })} options={(departments.data ?? []).map((item) => [item.id, item.name])} />
        <NativeSelect label="Status" value={get("status")} onChange={(value) => setParams({ status: value || null })} options={["active", "invited", "on_leave", "inactive", "offboarding"].map((item) => [item, titleCase(item)])} />
        <NativeSelect label="Type" value={get("type")} onChange={(value) => setParams({ type: value || null })} options={["full_time", "part_time", "contract", "intern"].map((item) => [item, titleCase(item)])} />
      </div>
      <QueryBoundary isPending={query.isPending} isError={query.isError} error={query.error} data={query.data} onRetry={() => void query.refetch()} isEmpty={!query.data?.results.length} empty={<p className="text-sm text-muted-foreground">No employees match these filters.</p>}>
        {(data) => grid ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.results.map((employee) => <EmployeeCard key={employee.id} employee={employee} />)}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <caption className="sr-only">Employees</caption>
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Title</th>
                  <th className="p-3 font-medium">Location</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((employee) => (
                  <tr key={employee.id} className="border-b last:border-0">
                    <td className="p-3"><Link className="font-medium hover:underline" href={`/employees/${employee.id}`}>{personName(employee)}</Link><div className="text-xs text-muted-foreground">{employee.employee_code}</div></td>
                    <td className="p-3">{employee.job_title}</td>
                    <td className="p-3">{employee.location}</td>
                    <td className="p-3"><EmploymentBadge status={employee.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}

function EmployeeCard({ employee }: { employee: Employee }) {
  return (
    <Link href={`/employees/${employee.id}`} className="rounded-xl border bg-card p-4 hover:bg-muted/40">
      <div className="flex items-center gap-3">
        <UserAvatar name={personName(employee)} />
        <div>
          <p className="font-medium">{personName(employee)}</p>
          <p className="text-xs text-muted-foreground">{employee.job_title}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span>{employee.location}</span>
        <EmploymentBadge status={employee.status} />
      </div>
    </Link>
  );
}

export function EmployeeProfileScreen({ self = false }: { self?: boolean }) {
  const params = useParams<{ id: string }>();
  const { user, permissions } = useAuth();
  const id = self ? user?.id : params.id;
  const employee = useQuery({ queryKey: ["employees", id], queryFn: () => employeeService.get(id!), enabled: Boolean(id) });
  const tasks = useQuery({ queryKey: ["tasks", "employee", id], queryFn: () => taskService.list({ assignee: id, page_size: 8 }), enabled: Boolean(id) });
  const leave = useQuery({ queryKey: ["leave", "employee", id], queryFn: () => leaveService.list({ employee: id, page_size: 5 }), enabled: Boolean(id) && (self || hasPermission(permissions, "leave.manage") || hasPermission(permissions, "leave.view_team")) });
  const attendance = useQuery({ queryKey: ["attendance", "employee", id], queryFn: () => attendanceService.records({ employee: id, page_size: 5 }), enabled: Boolean(id) });
  const [confirm, setConfirm] = useState(false);
  const queryClient = useQueryClient();
  const deactivate = useMutation({
    mutationFn: () => employeeService.deactivate(id!),
    onSuccess: async () => {
      toast.success("Employee deactivated. The record is retained.");
      setConfirm(false);
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <QueryBoundary isPending={employee.isPending} isError={employee.isError} error={employee.error} data={employee.data} onRetry={() => void employee.refetch()}>
      {(person) => (
        <div className="space-y-4">
          <PageHeader
            title={personName(person)}
            description={`${person.job_title} · ${person.employee_code}`}
            actions={
              <>
                {self ? <Button variant="outline" nativeButton={false} render={<Link href="/profile/edit" />}>Edit my details</Button> : null}
                {!self && hasPermission(permissions, "employees.manage") ? <Button variant="outline" nativeButton={false} render={<Link href={`/employees/${person.id}/edit`} />}>Edit HR record</Button> : null}
                {!self && hasPermission(permissions, "employees.deactivate") && person.status !== "inactive" ? <Button variant="destructive" onClick={() => setConfirm(true)}>Deactivate</Button> : null}
              </>
            }
          />
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <section className="rounded-xl border bg-card p-4">
              <UserAvatar name={personName(person)} size="lg" />
              <dl className="mt-4 space-y-2 text-sm">
                <Info label="Email" value={person.email} />
                <Info label="Phone" value={person.phone || "—"} />
                <Info label="Location" value={person.location} />
                <Info label="Type" value={titleCase(person.employment_type)} />
                <Info label="Joined" value={formatDateOnly(person.start_date)} />
                <Info label="Status" value={titleCase(person.status)} />
                {person.salary_band ? <Info label="Salary band" value={person.salary_band} /> : null}
                {person.date_of_birth ? <Info label="Date of birth" value={formatDateOnly(person.date_of_birth)} /> : null}
                {person.emergency_contact_name ? <Info label="Emergency contact" value={`${person.emergency_contact_name} ${person.emergency_contact_phone ?? ""}`} /> : null}
              </dl>
            </section>
            <div className="space-y-4">
              <section className="rounded-xl border bg-card p-4">
                <h2 className="text-sm font-medium">Assigned tasks</h2>
                <div className="mt-2 space-y-2">
                  {tasks.data?.results.map((task) => (
                    <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-center justify-between text-sm hover:underline">
                      <span>{task.key} {task.title}</span><StatusBadge status={task.status} />
                    </Link>
                  ))}
                  {tasks.data?.results.length === 0 ? <p className="text-sm text-muted-foreground">No assigned tasks.</p> : null}
                </div>
              </section>
              <section className="rounded-xl border bg-card p-4">
                <h2 className="text-sm font-medium">Recent attendance</h2>
                <div className="mt-2 space-y-1 text-sm">
                  {attendance.data?.results.map((record) => (
                    <p key={record.id}>{formatDateOnly(record.date)} · {titleCase(record.status)} {record.exceptions.join(", ")}</p>
                  ))}
                </div>
              </section>
              {leave.data ? (
                <section className="rounded-xl border bg-card p-4">
                  <h2 className="text-sm font-medium">Leave</h2>
                  <div className="mt-2 space-y-2">
                    {leave.data.results.map((request) => (
                      <p key={request.id} className="flex items-center justify-between text-sm">
                        <span>{request.leave_type_name} · {formatDateOnly(request.start_date)}</span>
                        <RequestStatusBadge status={request.status} />
                      </p>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
          <AlertDialog open={confirm} onOpenChange={setConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate {personName(person)}?</AlertDialogTitle>
                <AlertDialogDescription>The employment record stays in the directory as inactive. This does not delete tasks or history.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
                <Button variant="destructive" disabled={deactivate.isPending} onClick={() => deactivate.mutate()}>Deactivate</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </QueryBoundary>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd>{value}</dd></div>;
}

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export function EmployeeFormScreen({ mode }: { mode: "create" | "edit" }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const existing = useQuery({
    queryKey: ["employees", params.id],
    queryFn: () => employeeService.get(params.id),
    enabled: mode === "edit",
  });
  const departments = useQuery({ queryKey: ["departments"], queryFn: () => organisationService.departments() });
  const teams = useQuery({ queryKey: ["teams"], queryFn: () => organisationService.teams() });
  const people = useQuery({ queryKey: ["people"], queryFn: () => employeeService.people() });
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    values: mode === "edit" && existing.data ? {
      first_name: existing.data.first_name,
      last_name: existing.data.last_name,
      email: existing.data.email,
      job_title: existing.data.job_title,
      department_id: existing.data.department_id,
      team_id: existing.data.team_id ?? "",
      manager_id: existing.data.manager_id ?? "",
      location: existing.data.location,
      employment_type: existing.data.employment_type,
      start_date: existing.data.start_date,
      phone: existing.data.phone ?? "",
      role: "employee" as const,
      invite: false,
    } : undefined,
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      job_title: "",
      department_id: "",
      team_id: "",
      manager_id: "",
      location: "",
      employment_type: "full_time" as const,
      start_date: "",
      phone: "",
      role: "employee" as const,
      invite: true,
    },
  });
  const save = useMutation({
    mutationFn: (values: EmployeeFormValues) => {
      const payload = { ...values, team_id: values.team_id || null, manager_id: values.manager_id || null };
      return mode === "edit" ? employeeService.update(params.id, payload) : employeeService.create(payload);
    },
    onSuccess: (employee) => {
      toast.success(mode === "edit" ? "Employee updated." : "Employee saved.");
      router.push(`/employees/${employee.id}`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <form className="mx-auto grid max-w-3xl gap-3" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
      <PageHeader title={mode === "edit" ? "Edit employee" : "Add employee"} description="HR-controlled fields. People can edit their own contact details from My Profile." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name" error={form.formState.errors.first_name?.message}><Input {...form.register("first_name")} /></Field>
        <Field label="Last name" error={form.formState.errors.last_name?.message}><Input {...form.register("last_name")} /></Field>
        <Field label="Work email" error={form.formState.errors.email?.message}><Input type="email" {...form.register("email")} /></Field>
        <Field label="Job title" error={form.formState.errors.job_title?.message}><Input {...form.register("job_title")} /></Field>
        <Field label="Department" error={form.formState.errors.department_id?.message}>
          <Select value={form.watch("department_id") || undefined} onValueChange={(value) => value && form.setValue("department_id", value, { shouldValidate: true })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{departments.data?.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Team">
          <Select value={form.watch("team_id") || "none"} onValueChange={(value) => form.setValue("team_id", value === "none" ? "" : value ?? "")}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No team</SelectItem>
              {teams.data?.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Manager">
          <Select value={form.watch("manager_id") || "none"} onValueChange={(value) => form.setValue("manager_id", value === "none" ? "" : value ?? "")}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No manager</SelectItem>
              {people.data?.map((item) => <SelectItem key={item.id} value={item.id}>{personName(item)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Location" error={form.formState.errors.location?.message}><Input {...form.register("location")} /></Field>
        <Field label="Employment type">
          <Select value={form.watch("employment_type")} onValueChange={(value) => value && form.setValue("employment_type", value as Employee["employment_type"])}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full_time">Full time</SelectItem>
              <SelectItem value="part_time">Part time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="intern">Intern</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Joining date" error={form.formState.errors.start_date?.message}><Input type="date" {...form.register("start_date")} /></Field>
        <Field label="Role">
          <Select value={form.watch("role")} onValueChange={(value) => value && form.setValue("role", value as "employee")}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["employee", "project_manager", "manager", "hr_admin", "super_admin"].map((role) => <SelectItem key={role} value={role}>{titleCase(role)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        {mode === "create" ? (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.watch("invite")} onChange={(event) => form.setValue("invite", event.target.checked)} />
            Send invitation and keep the account inactive until it is accepted
          </label>
        ) : null}
      </div>
      <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save employee"}</Button>
    </form>
  );
}

export function ProfileEditScreen() {
  const { user } = useAuth();
  const employee = useQuery({ queryKey: ["employees", user?.id], queryFn: () => employeeService.get(user!.id), enabled: Boolean(user) });
  const form = useForm({
    resolver: zodResolver(profileSchema),
    values: employee.data ? {
      preferred_name: employee.data.preferred_name ?? "",
      phone: employee.data.phone ?? "",
      bio: employee.data.bio ?? "",
      personal_email: employee.data.personal_email ?? "",
      emergency_contact_name: employee.data.emergency_contact_name ?? "",
      emergency_contact_phone: employee.data.emergency_contact_phone ?? "",
    } : undefined,
  });
  const save = useMutation({
    mutationFn: employeeService.updateProfile,
    onSuccess: () => toast.success("Profile updated."),
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <form className="mx-auto grid max-w-xl gap-3" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
      <PageHeader title="My details" description="These fields are yours to edit. Job title, department, and status are maintained by HR." />
      <Field label="Preferred name"><Input {...form.register("preferred_name")} /></Field>
      <Field label="Phone"><Input {...form.register("phone")} /></Field>
      <Field label="Personal email" error={form.formState.errors.personal_email?.message}><Input {...form.register("personal_email")} /></Field>
      <Field label="Bio"><Textarea {...form.register("bio")} /></Field>
      <Field label="Emergency contact"><Input {...form.register("emergency_contact_name")} /></Field>
      <Field label="Emergency phone"><Input {...form.register("emergency_contact_phone")} /></Field>
      <Button type="submit" disabled={save.isPending}>Save</Button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-sm"><span>{label}</span>{children}{error ? <span className="text-xs text-destructive">{error}</span> : null}</label>;
}

function NativeSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return (
    <select aria-label={label} className="h-8 rounded-lg border bg-card px-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">All</option>
      {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
    </select>
  );
}

declare global {
  interface Window {
    employeeSearchTimer?: number;
  }
}
