"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClockPanel } from "@/features/attendance/clock-panel";
import { PageHeader, QueryBoundary } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-provider";
import { useUrlState } from "@/hooks/use-url-state";
import { reportService, organisationService } from "@/lib/api/services";
import { formatDateOnly, formatDateTime, greeting, todayInTimeZone } from "@/lib/format";
import { statusLabel } from "@/lib/tasks/transitions";
import { hasPermission } from "@/lib/permissions";

const CHART_COLORS = ["#12315a", "#1d4e89", "#1f7a4d", "#b45309", "#b42318", "#5c6b80", "#8a5a00"];

export function DashboardScreen() {
  const { user, permissions } = useAuth();
  const { get, setParams } = useUrlState();
  const from = get("from") || `${todayInTimeZone().slice(0, 8)}01`;
  const to = get("to") || todayInTimeZone();
  const department = get("department");
  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: () => organisationService.departments(),
    enabled: hasPermission(permissions, "departments.view") || hasPermission(permissions, "reports.view_org"),
  });
  const dashboard = useQuery({
    queryKey: ["reports", "dashboard", { from, to, department }],
    queryFn: () => reportService.dashboard({ from, to, department: department || undefined }),
  });

  return (
    <QueryBoundary
      isPending={dashboard.isPending}
      isError={dashboard.isError}
      error={dashboard.error}
      data={dashboard.data}
      onRetry={() => void dashboard.refetch()}
    >
      {(data) => (
        <div className="space-y-5">
          <PageHeader
            title={`${greeting()}, ${data.greeting_name}`}
            description={`${formatDateOnly(todayInTimeZone())} · ${data.scope === "organisation" ? "Organisation" : data.scope === "team" ? "Team" : "Personal"} view`}
            meta={`Showing ${formatDateOnly(data.range.from)} – ${formatDateOnly(data.range.to)}${department ? ` · filtered department` : ""}`}
            actions={
              hasPermission(permissions, "reports.view_org") ? (
                <label className="text-xs text-muted-foreground">
                  Department
                  <select
                    className="ml-2 h-8 rounded-lg border bg-card px-2 text-sm text-foreground"
                    value={department || "all"}
                    aria-label="Department filter"
                    onChange={(event) => setParams({ department: event.target.value === "all" ? null : event.target.value })}
                  >
                    <option value="all">All departments</option>
                    {departments.data?.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
              ) : null
            }
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.metrics.map((metric) => {
              const content = (
                <Card className="h-full shadow-sm transition-shadow duration-200 hover:shadow-md">
                  <CardHeader>
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <CardTitle className="text-2xl tabular-nums">{metric.value}</CardTitle>
                  </CardHeader>
                  {metric.hint ? <CardContent className="text-xs text-muted-foreground">{metric.hint}</CardContent> : null}
                </Card>
              );
              return metric.href ? (
                <Link key={metric.id} href={metric.href} className="rounded-xl outline-none transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none">
                  {content}
                </Link>
              ) : (
                <div key={metric.id}>{content}</div>
              );
            })}
          </div>
          <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
            {data.attendance_today && user ? <ClockPanel today={data.attendance_today} /> : <div />}
            <Card>
              <CardHeader>
                <CardTitle>Tasks by status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56" role="img" aria-label="Bar chart of tasks by status">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.task_summary.map((item) => ({ name: statusLabel(item.status), count: item.count }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} height={50} textAnchor="end" />
                      <YAxis allowDecimals={false} width={28} />
                      <Tooltip />
                      <Bar dataKey="count" radius={4}>
                        {data.task_summary.map((item, index) => (
                          <Cell key={item.status} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <table className="sr-only">
                  <caption>Tasks by status</caption>
                  <tbody>
                    {data.task_summary.map((item) => (
                      <tr key={item.status}><th>{statusLabel(item.status)}</th><td>{item.count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <TaskList title="Upcoming deadlines" tasks={data.upcoming_deadlines} empty="No deadlines in the next 7 days." />
            <TaskList title="Overdue" tasks={data.overdue_tasks} empty="Nothing is overdue." />
          </div>
          {data.scope === "self" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Leave balance</CardTitle></CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-3">
                  {data.leave_balances.map((balance) => (
                    <Link key={balance.leave_type_id} href="/leave" className="rounded-lg border p-3 hover:bg-muted">
                      <p className="text-xs text-muted-foreground">{balance.leave_type_name}</p>
                      <p className="text-xl font-semibold tabular-nums">{balance.available_days}</p>
                      <p className="text-xs text-muted-foreground">{balance.used_days} used · {balance.pending_days} pending</p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Pending requests</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {data.pending_requests.length === 0 ? <p className="text-sm text-muted-foreground">No pending leave requests.</p> : data.pending_requests.map((request) => (
                    <Link key={request.id} href={`/leave/${request.id}`} className="block rounded-lg border p-3 text-sm hover:bg-muted">
                      {request.leave_type_name} · {formatDateOnly(request.start_date)} – {formatDateOnly(request.end_date)}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : null}
          {data.team ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Workload</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {data.team.workload.length === 0 ? <p className="text-sm text-muted-foreground">No open tasks.</p> : data.team.workload.map((item) => (
                    <div key={item.employee_id} className="flex items-center justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="tabular-nums text-muted-foreground">{item.open_tasks} open · {item.overdue} overdue</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Upcoming team leave</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {data.team.upcoming_leave.length === 0 ? <p className="text-sm text-muted-foreground">No approved leave ahead.</p> : data.team.upcoming_leave.map((item) => (
                    <p key={item.id} className="text-sm">{item.employee.name} · {formatDateOnly(item.start_date)} – {formatDateOnly(item.end_date)}</p>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : null}
          {data.organisation ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Headcount by department</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {data.organisation.departments.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.name}</span><span className="tabular-nums">{item.count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Recent audit</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {data.organisation.audit.length === 0 ? <p className="text-sm text-muted-foreground">Audit events are hidden for this account.</p> : data.organisation.audit.map((event) => (
                    <p key={event.id} className="text-sm"><span className="font-medium">{event.actor_name}</span> {event.action} · {event.target}</p>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.notifications.length === 0 ? <p className="text-sm text-muted-foreground">You are caught up.</p> : data.notifications.map((item) => (
                  <Link key={item.id} href={item.href ?? "/notifications"} className="block text-sm hover:underline">
                    {item.title} <span className="text-muted-foreground">{formatDateTime(item.created_at)}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.activity.length === 0 ? <p className="text-sm text-muted-foreground">No recent activity.</p> : data.activity.map((item) => (
                  <p key={item.id} className="text-sm"><span className="font-medium">{item.actor_name}</span> {item.message}</p>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </QueryBoundary>
  );
}

function TaskList({ title, tasks, empty }: { title: string; tasks: { id: string; key: string; title: string; due_date: string | null; status: import("@/types").TaskStatus }[]; empty: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : tasks.map((task) => (
          <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm hover:bg-muted">
            <span><span className="font-mono text-xs text-muted-foreground">{task.key}</span> {task.title}</span>
            <span className="flex items-center gap-2"><StatusBadge status={task.status} /><span className="text-xs text-muted-foreground">{formatDateOnly(task.due_date)}</span></span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
