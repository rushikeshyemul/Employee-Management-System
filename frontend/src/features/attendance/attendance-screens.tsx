"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { ClockPanel } from "@/features/attendance/clock-panel";
import { PageHeader, PreviewBanner, QueryBoundary } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-provider";
import { useUrlState } from "@/hooks/use-url-state";
import { attendanceService, organisationService } from "@/lib/api/services";
import { errorMessage } from "@/lib/api/errors";
import { dateTimeInTimeZone, formatDateOnly, formatMinutes, formatTime, titleCase, todayInTimeZone } from "@/lib/format";
import { correctionSchema } from "@/lib/validation";
import { hasPermission } from "@/lib/permissions";

export function AttendanceScreen() {
  const history = useQuery({
    queryKey: ["attendance", "mine"],
    queryFn: () => attendanceService.records({ page_size: 31 }),
  });
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  return (
    <div className="space-y-4">
      <PageHeader title="Attendance" description="Clock actions follow the latest server state. Worked time is the value returned by the attendance service." />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <ClockPanel />
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">{format(month, "MMMM yyyy")}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setMonth((value) => addMonths(value, -1))}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setMonth((value) => addMonths(value, 1))}>Next</Button>
            </div>
          </div>
          <MonthGrid
            month={month}
            marks={Object.fromEntries((history.data?.results ?? []).map((record) => [record.date, titleCase(record.status)]))}
          />
        </section>
      </div>
      <CorrectionForm />
      <QueryBoundary isPending={history.isPending} isError={history.isError} error={history.error} data={history.data} onRetry={() => void history.refetch()}>
        {(data) => (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <caption className="sr-only">Attendance history</caption>
              <thead className="border-b text-left text-xs text-muted-foreground"><tr><th className="p-3">Date</th><th className="p-3">In</th><th className="p-3">Out</th><th className="p-3">Worked</th><th className="p-3">Status</th></tr></thead>
              <tbody>
                {data.results.map((record) => (
                  <tr key={record.id} className="border-b last:border-0">
                    <td className="p-3">{formatDateOnly(record.date)}</td>
                    <td className="p-3">{formatTime(record.clock_in_at)}</td>
                    <td className="p-3">{formatTime(record.clock_out_at)}</td>
                    <td className="p-3">{formatMinutes(record.worked_minutes)}</td>
                    <td className="p-3">{titleCase(record.status)} {record.exceptions.join(", ")}</td>
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

export function AttendanceManageScreen() {
  const { get, setParams, page } = useUrlState();
  const { permissions } = useAuth();
  const departments = useQuery({ queryKey: ["departments"], queryFn: () => organisationService.departments() });
  const records = useQuery({
    queryKey: ["attendance", "manage", { page, from: get("from"), to: get("to"), department: get("department"), exception: get("exception") }],
    queryFn: () => attendanceService.records({
      page,
      page_size: 20,
      from: get("from") || undefined,
      to: get("to") || undefined,
      department: get("department") || undefined,
      exception: get("exception") === "1" ? 1 : undefined,
    }),
  });
  const corrections = useQuery({
    queryKey: ["attendance", "corrections"],
    queryFn: () => attendanceService.corrections({ status: "pending", page_size: 20 }),
    enabled: hasPermission(permissions, "attendance.manage") || hasPermission(permissions, "approvals.decide"),
  });
  return (
    <div className="space-y-4">
      <PageHeader title="Attendance management" description="Review records and corrections. Decisions are saved through the approval centre so the original punch is not overwritten silently." />
      <div className="flex flex-wrap gap-2">
        <Input type="date" aria-label="From" defaultValue={get("from")} onChange={(event) => setParams({ from: event.target.value || null })} />
        <Input type="date" aria-label="To" defaultValue={get("to")} onChange={(event) => setParams({ to: event.target.value || null })} />
        <select aria-label="Department" className="h-8 rounded-lg border bg-card px-2 text-sm" value={get("department")} onChange={(event) => setParams({ department: event.target.value || null })}>
          <option value="">All departments</option>
          {departments.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={get("exception") === "1"} onChange={(event) => setParams({ exception: event.target.checked ? "1" : null })} /> Exceptions only</label>
      </div>
      <QueryBoundary isPending={records.isPending} isError={records.isError} error={records.error} data={records.data} onRetry={() => void records.refetch()}>
        {(data) => (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <caption className="sr-only">Organisation attendance</caption>
              <thead className="border-b text-left text-xs text-muted-foreground"><tr><th className="p-3">Employee</th><th className="p-3">Date</th><th className="p-3">In</th><th className="p-3">Out</th><th className="p-3">Exceptions</th></tr></thead>
              <tbody>
                {data.results.map((record) => (
                  <tr key={record.id} className="border-b last:border-0">
                    <td className="p-3">{record.employee.name}</td>
                    <td className="p-3">{formatDateOnly(record.date)}</td>
                    <td className="p-3">{formatTime(record.clock_in_at)}</td>
                    <td className="p-3">{record.clock_out_at ? formatTime(record.clock_out_at) : <span className="text-destructive">Missing</span>}</td>
                    <td className="p-3">{record.exceptions.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryBoundary>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-medium">Correction queue</h2>
        <div className="mt-2 space-y-2">
          {corrections.data?.results.length ? corrections.data.results.map((item) => (
            <p key={item.id} className="text-sm">{item.employee.name} · {formatDateOnly(item.date)} · {item.reason}</p>
          )) : <p className="text-sm text-muted-foreground">No pending corrections in your scope.</p>}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Approve or reject these from the Approval Centre so the decision comment is stored.</p>
      </section>
    </div>
  );
}

function CorrectionForm() {
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(correctionSchema),
    defaultValues: { date: todayInTimeZone(), requested_clock_in_at: "", requested_clock_out_at: "", reason: "" },
  });
  const save = useMutation({
    mutationFn: attendanceService.createCorrection,
    onSuccess: async () => {
      toast.success("Correction submitted for review.");
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <form className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => save.mutate({
      date: values.date,
      requested_clock_in_at: values.requested_clock_in_at ? dateTimeInTimeZone(values.date, values.requested_clock_in_at) : null,
      requested_clock_out_at: values.requested_clock_out_at ? dateTimeInTimeZone(values.date, values.requested_clock_out_at) : null,
      reason: values.reason,
    }))}>
      <div className="md:col-span-2">
        <h2 className="text-sm font-medium">Request a correction</h2>
        <p className="text-xs text-muted-foreground">A correction keeps the original punch and asks a manager to approve the change.</p>
      </div>
      <label className="grid gap-1 text-sm">Date<Input type="date" {...form.register("date")} /></label>
      <label className="grid gap-1 text-sm">Corrected clock in<Input type="time" {...form.register("requested_clock_in_at")} /></label>
      <label className="grid gap-1 text-sm">Corrected clock out<Input type="time" {...form.register("requested_clock_out_at")} /></label>
      <label className="grid gap-1 text-sm md:col-span-2">Reason<Textarea {...form.register("reason")} />{form.formState.errors.reason ? <span className="text-xs text-destructive">{form.formState.errors.reason.message}</span> : null}</label>
      <Button type="submit" disabled={save.isPending}>Submit correction</Button>
    </form>
  );
}

export function MonthGrid({ month, marks }: { month: Date; marks: Record<string, string> }) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  return (
    <div className="grid grid-cols-7 gap-1 text-center text-xs">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="py-1 text-muted-foreground">{day}</div>)}
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const mark = marks[key];
        return (
          <div key={key} className={`min-h-12 rounded-md border p-1 ${isSameMonth(day, month) ? "bg-background" : "opacity-40"}`}>
            <div>{format(day, "d")}</div>
            {mark ? <div className="truncate text-[10px] text-muted-foreground">{mark}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

export function UnavailableModule({ title, endpoint }: { title: string; endpoint: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <PreviewBanner title="Unavailable until the backend contract is confirmed">
        This screen is a frontend foundation. In API mode it does not pretend to save data. Proposed endpoint: {endpoint}
      </PreviewBanner>
    </div>
  );
}
