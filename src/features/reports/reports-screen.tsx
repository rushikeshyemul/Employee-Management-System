"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, QueryBoundary } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/badges";
import { Input } from "@/components/ui/input";
import { organisationService, reportService } from "@/lib/api/services";
import { formatDateOnly, startOfMonthDate, titleCase, todayInTimeZone } from "@/lib/format";
import { useUrlState } from "@/hooks/use-url-state";

export function ReportsScreen() {
  const { get, setParams } = useUrlState();
  const from = get("from") || startOfMonthDate();
  const to = get("to") || todayInTimeZone();
  const department = get("department") || undefined;
  const filters = { from, to, department_id: department };
  const departments = useQuery({ queryKey: ["departments"], queryFn: () => organisationService.departments() });
  const tasks = useQuery({ queryKey: ["reports", "tasks", filters], queryFn: () => reportService.tasks(filters) });
  const attendance = useQuery({ queryKey: ["reports", "attendance", filters], queryFn: () => reportService.attendance(filters) });
  const leave = useQuery({ queryKey: ["reports", "leave", filters], queryFn: () => reportService.leave(filters) });
  const headcount = useQuery({ queryKey: ["reports", "headcount", filters], queryFn: () => reportService.headcount(filters) });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Counts describe work status and staffing. They are not a productivity score."
        meta={<span>Showing {formatDateOnly(from)} to {formatDateOnly(to)}{department ? ` · department filter applied` : ""}.</span>}
      />
      <div className="flex flex-wrap gap-2">
        <Input type="date" aria-label="From" value={from} onChange={(event) => setParams({ from: event.target.value || null, page: null })} />
        <Input type="date" aria-label="To" value={to} onChange={(event) => setParams({ to: event.target.value || null })} />
        <select aria-label="Department" className="h-8 rounded-lg border bg-card px-2 text-sm" value={department ?? ""} onChange={(event) => setParams({ department: event.target.value || null })}>
          <option value="">All departments</option>
          {departments.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      <QueryBoundary isPending={tasks.isPending} isError={tasks.isError} error={tasks.error} data={tasks.data} onRetry={() => void tasks.refetch()}>
        {(report) => (
          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-medium">Tasks</h2>
            <p className="text-xs text-muted-foreground">{report.open_tasks} open · {report.completed_in_range} completed in range</p>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.by_status.map((item) => ({ name: titleCase(item.status), count: item.count }))}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} width={28} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>Tasks by status</caption>
              <tbody>{report.by_status.map((item) => <tr key={item.status}><th>{item.status}</th><td>{item.count}</td></tr>)}</tbody>
            </table>
            <h3 className="mt-4 text-sm font-medium">Overdue</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {report.overdue.length ? report.overdue.map((task) => (
                <li key={task.id}><Link className="hover:underline" href={`/tasks/${task.id}`}>{task.key} {task.title}</Link> · <StatusBadge status={task.status} /></li>
              )) : <li className="text-muted-foreground">No overdue tasks in this range.</li>}
            </ul>
            <h3 className="mt-4 text-sm font-medium">Open work by person</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {report.workload.map((item) => <li key={item.employee_id}>{item.name}: {item.open_tasks} open, {item.overdue} overdue</li>)}
            </ul>
          </section>
        )}
      </QueryBoundary>
      <QueryBoundary isPending={attendance.isPending} isError={attendance.isError} error={attendance.error} data={attendance.data} onRetry={() => void attendance.refetch()}>
        {(report) => (
          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-medium">Attendance</h2>
            <p className="mt-1 text-sm">Present {report.summary.present} · Late {report.summary.late} · Absent {report.summary.absent} · Partial {report.summary.partial}</p>
            <h3 className="mt-3 text-sm font-medium">Exceptions</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {report.exceptions.length ? report.exceptions.slice(0, 12).map((record) => (
                <li key={record.id}>{record.employee.name} · {formatDateOnly(record.date)} · {record.exceptions.join(", ") || titleCase(record.status)}</li>
              )) : <li className="text-muted-foreground">No exceptions in this range.</li>}
            </ul>
          </section>
        )}
      </QueryBoundary>
      <QueryBoundary isPending={leave.isPending} isError={leave.isError} error={leave.error} data={leave.data} onRetry={() => void leave.refetch()}>
        {(report) => (
          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-medium">Leave utilisation</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {report.by_type.map((item) => <li key={item.leave_type_name}>{item.leave_type_name}: {item.used_days} used of {item.allocated_days}, {item.pending_days} pending</li>)}
            </ul>
          </section>
        )}
      </QueryBoundary>
      <QueryBoundary isPending={headcount.isPending} isError={headcount.isError} error={headcount.error} data={headcount.data} onRetry={() => void headcount.refetch()}>
        {(report) => (
          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-medium">Headcount</h2>
            <p className="mt-1 text-sm">{report.active} active of {report.total}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {report.by_department.map((item) => <li key={item.name}>{item.name}: {item.count}</li>)}
            </ul>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium">Joiners</h3>
                {report.joiners.length ? report.joiners.map((person) => <p key={person.id} className="text-sm">{person.first_name} {person.last_name} · {formatDateOnly(person.start_date)}</p>) : <p className="text-sm text-muted-foreground">None in this range.</p>}
              </div>
              <div>
                <h3 className="text-sm font-medium">Exits</h3>
                {report.exits.length ? report.exits.map((person) => <p key={person.id} className="text-sm">{person.first_name} {person.last_name}</p>) : <p className="text-sm text-muted-foreground">None in this range.</p>}
              </div>
            </div>
          </section>
        )}
      </QueryBoundary>
    </div>
  );
}
