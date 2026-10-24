"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { attendanceService } from "@/lib/api/services";
import { errorMessage } from "@/lib/api/errors";
import { formatMinutes, formatTime } from "@/lib/format";
import { canClockIn, canClockOut, canEndBreak, canStartBreak } from "@/lib/attendance/rules";
import type { AttendanceToday } from "@/types";

export function ClockPanel({ today }: { today?: AttendanceToday }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["attendance", "today"],
    queryFn: () => attendanceService.today(),
    initialData: today,
    refetchInterval: (current) =>
      current.state.data?.status === "clocked_in" || current.state.data?.status === "on_break"
        ? 60_000
        : false,
  });
  const state = query.data;

  const mutate = (action: "in" | "out" | "break-start" | "break-end") =>
    ({
      mutationFn: () => {
        if (action === "in") return attendanceService.clockIn();
        if (action === "out") return attendanceService.clockOut();
        if (action === "break-start") return attendanceService.startBreak();
        return attendanceService.endBreak();
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ["attendance"] });
        await queryClient.invalidateQueries({ queryKey: ["reports"] });
        toast.success("Attendance updated from the server.");
      },
      onError: (error: unknown) => toast.error(errorMessage(error)),
    });

  const clockIn = useMutation(mutate("in"));
  const clockOut = useMutation(mutate("out"));
  const startBreak = useMutation(mutate("break-start"));
  const endBreak = useMutation(mutate("break-end"));
  const pending = clockIn.isPending || clockOut.isPending || startBreak.isPending || endBreak.isPending;

  if (query.isPending || !state) {
    return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  }
  if (query.isError) {
    return (
      <div className="rounded-xl border p-4 text-sm" role="alert">
        <p>{errorMessage(query.error)}</p>
        <Button className="mt-3" variant="outline" onClick={() => void query.refetch()}>Retry</Button>
      </div>
    );
  }

  const statusCopy: Record<AttendanceToday["status"], string> = {
    not_started: "Not clocked in",
    clocked_in: "Clocked in",
    on_break: "On a break",
    clocked_out: "Clocked out for today",
  };

  return (
    <section className="rounded-xl border bg-card p-4" aria-labelledby="clock-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="clock-heading" className="text-sm font-medium">Today&apos;s attendance</h2>
          <p className="mt-1 text-lg font-semibold">{statusCopy[state.status]}</p>
          <p className="text-xs text-muted-foreground">Times are the server record in {state.timezone}.</p>
        </div>
        <p className="text-right">
          <span className="block text-2xl font-semibold tabular-nums">{formatMinutes(state.worked_minutes)}</span>
          <span className="text-xs text-muted-foreground">worked</span>
        </p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Clock in</dt>
          <dd>{formatTime(state.clock_in_at, state.timezone)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Clock out</dt>
          <dd>{formatTime(state.clock_out_at, state.timezone)}</dd>
        </div>
      </dl>
      {state.is_late ? <p className="mt-3 text-xs text-warning">Marked late against the {state.standard_start} start.</p> : null}
      {state.missing_clock_out ? <p className="mt-2 text-xs text-destructive">A previous day is missing a clock-out. Request a correction.</p> : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          className="sm:flex-1"
          variant={canClockIn(state.status) ? "success" : "outline"}
          size="lg"
          disabled={!canClockIn(state.status) || pending}
          onClick={() => clockIn.mutate()}
        >
          {clockIn.isPending ? "Clocking in…" : "Clock in"}
        </Button>
        <Button
          className="sm:flex-1"
          variant={canClockOut(state.status) ? "success" : "outline"}
          size="lg"
          disabled={!canClockOut(state.status) || pending}
          onClick={() => clockOut.mutate()}
        >
          {clockOut.isPending ? "Clocking out…" : "Clock out"}
        </Button>
      </div>
      {state.breaks_enabled ? (
        <div className="mt-2">
          {canStartBreak(state.status, state.breaks_enabled) ? (
            <Button variant="secondary" className="w-full" disabled={pending} onClick={() => startBreak.mutate()}>
              Start break
            </Button>
          ) : null}
          {canEndBreak(state.status) ? (
            <Button variant="secondary" className="w-full" disabled={pending} onClick={() => endBreak.mutate()}>
              End break
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
