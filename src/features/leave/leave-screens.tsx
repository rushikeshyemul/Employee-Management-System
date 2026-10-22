"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { RequestStatusBadge } from "@/components/shared/badges";
import { PageHeader, QueryBoundary } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { leaveService } from "@/lib/api/services";
import { errorMessage } from "@/lib/api/errors";
import { formatDateOnly } from "@/lib/format";
import { countLeaveDays } from "@/lib/leave/rules";
import { leaveSchema } from "@/lib/validation";

export function LeaveScreen({ team = false, manage = false }: { team?: boolean; manage?: boolean }) {
  const requests = useQuery({
    queryKey: ["leave", { team, manage }],
    queryFn: () => leaveService.list({ page_size: 50, scope: team || manage ? undefined : "mine" }),
  });
  const balances = useQuery({ queryKey: ["leave", "balances"], queryFn: () => leaveService.balances(), enabled: !manage });
  return (
    <div className="space-y-4">
      <PageHeader
        title={manage ? "Leave management" : team ? "Team leave calendar" : "Leave & requests"}
        description="Balances and warnings come from the server. A request stays pending until an approver confirms it."
      />
      {balances.data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {balances.data.map((balance) => (
            <article key={balance.leave_type_id} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{balance.leave_type_name}</p>
              <p className="text-2xl font-semibold tabular-nums">{balance.available_days}</p>
              <p className="text-xs text-muted-foreground">{balance.allocated_days} allocated · {balance.used_days} used · {balance.pending_days} pending</p>
            </article>
          ))}
        </div>
      ) : null}
      {!manage ? <LeaveForm balances={balances.data ?? []} /> : null}
      <LeaveCalendar requests={requests.data?.results ?? []} />
      <QueryBoundary isPending={requests.isPending} isError={requests.isError} error={requests.error} data={requests.data} onRetry={() => void requests.refetch()} isEmpty={!requests.data?.results.length} empty={<p className="text-sm text-muted-foreground">No leave requests.</p>}>
        {(data) => (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <caption className="sr-only">Leave requests</caption>
              <thead className="border-b text-left text-xs text-muted-foreground"><tr><th className="p-3">Employee</th><th className="p-3">Type</th><th className="p-3">Dates</th><th className="p-3">Days</th><th className="p-3">Status</th></tr></thead>
              <tbody>
                {data.results.map((request) => (
                  <tr key={request.id} className="border-b last:border-0">
                    <td className="p-3"><Link className="hover:underline" href={`/leave/${request.id}`}>{request.employee.name}</Link></td>
                    <td className="p-3">{request.leave_type_name}</td>
                    <td className="p-3">{formatDateOnly(request.start_date)} – {formatDateOnly(request.end_date)}</td>
                    <td className="p-3">{request.days}</td>
                    <td className="p-3"><RequestStatusBadge status={request.status} /></td>
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

function LeaveForm({ balances }: { balances: { leave_type_id: string; available_days: number; leave_type_name: string }[] }) {
  const types = useQuery({ queryKey: ["leave", "types"], queryFn: () => leaveService.types() });
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(leaveSchema),
    defaultValues: { leave_type_id: "", start_date: "", end_date: "", partial_day: "none" as const, reason: "" },
  });
  const values = form.watch();
  const preview = countLeaveDays(values.start_date, values.end_date, values.partial_day);
  const balance = balances.find((item) => item.leave_type_id === values.leave_type_id);
  const save = useMutation({
    mutationFn: leaveService.create,
    onSuccess: async () => {
      toast.success("Leave request submitted. It is pending approval.");
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["leave"] });
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <form className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2" onSubmit={form.handleSubmit((input) => save.mutate(input))}>
      <h2 className="text-sm font-medium md:col-span-2">Request leave</h2>
      <div className="grid gap-1.5">
        <Label>Leave type</Label>
        <Select value={form.watch("leave_type_id") || undefined} onValueChange={(value) => value && form.setValue("leave_type_id", value, { shouldValidate: true })}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>{types.data?.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}</SelectContent>
        </Select>
        {form.formState.errors.leave_type_id ? <p className="text-xs text-destructive">{form.formState.errors.leave_type_id.message}</p> : null}
      </div>
      <div className="grid gap-1.5">
        <Label>Part of day</Label>
        <Select value={form.watch("partial_day")} onValueChange={(value) => value && form.setValue("partial_day", value as "none")}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Full days</SelectItem>
            <SelectItem value="am">Morning only</SelectItem>
            <SelectItem value="pm">Afternoon only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <label className="grid gap-1.5 text-sm">Start<Input type="date" {...form.register("start_date")} /></label>
      <label className="grid gap-1.5 text-sm">End<Input type="date" {...form.register("end_date")} />{form.formState.errors.end_date ? <span className="text-xs text-destructive">{form.formState.errors.end_date.message}</span> : null}</label>
      <label className="grid gap-1.5 text-sm md:col-span-2">Reason<Textarea {...form.register("reason")} />{form.formState.errors.reason ? <span className="text-xs text-destructive">{form.formState.errors.reason.message}</span> : null}</label>
      <p className="text-xs text-muted-foreground md:col-span-2">
        {preview.error ? preview.error : `${preview.days} working day${preview.days === 1 ? "" : "s"}.`}
        {balance ? ` ${balance.leave_type_name} available: ${balance.available_days}.` : ""}
      </p>
      <Button type="submit" disabled={save.isPending}>Submit request</Button>
    </form>
  );
}

function LeaveCalendar({ requests }: { requests: { id: string; employee: { name: string }; start_date: string; end_date: string; status: string }[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) });
  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">{format(month, "MMMM yyyy")}</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setMonth((value) => addMonths(value, -1))}>Previous</Button>
          <Button size="sm" variant="outline" onClick={() => setMonth((value) => addMonths(value, 1))}>Next</Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const hits = requests.filter((request) => request.start_date <= key && request.end_date >= key && request.status !== "withdrawn" && request.status !== "cancelled");
          return (
            <div key={key} className={`min-h-16 rounded-md border p-1 ${isSameMonth(day, month) ? "" : "opacity-40"}`}>
              <div>{format(day, "d")}</div>
              {hits.slice(0, 2).map((hit) => <div key={hit.id} className="truncate text-[10px]">{hit.employee.name.split(" ")[0]}</div>)}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function LeaveDetailScreen() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<"withdraw" | "cancel" | null>(null);
  const query = useQuery({ queryKey: ["leave", params.id], queryFn: () => leaveService.get(params.id) });
  const action = useMutation({
    mutationFn: () => confirm === "cancel" ? leaveService.cancel(params.id) : leaveService.withdraw(params.id),
    onSuccess: async () => {
      toast.success(confirm === "cancel" ? "Leave cancelled." : "Request withdrawn.");
      setConfirm(null);
      await queryClient.invalidateQueries({ queryKey: ["leave"] });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <QueryBoundary isPending={query.isPending} isError={query.isError} error={query.error} data={query.data} onRetry={() => void query.refetch()}>
      {(request) => (
        <div className="max-w-2xl space-y-4">
          <PageHeader title={request.leave_type_name} description={`${request.employee.name} · ${request.days} day${request.days === 1 ? "" : "s"}`} actions={<RequestStatusBadge status={request.status} />} />
          <dl className="grid gap-2 rounded-xl border bg-card p-4 text-sm">
            <div>Dates: {formatDateOnly(request.start_date)} – {formatDateOnly(request.end_date)}</div>
            <div>Reason: {request.reason}</div>
            {request.reviewer_comment ? <div>Reviewer: {request.reviewer_comment}</div> : null}
            {request.warnings.map((warning) => <p key={warning} className="text-warning">{warning}</p>)}
          </dl>
          <div className="flex gap-2">
            {request.status === "pending" ? <Button variant="outline" onClick={() => setConfirm("withdraw")}>Withdraw</Button> : null}
            {request.status === "approved" ? <Button variant="outline" onClick={() => setConfirm("cancel")}>Cancel</Button> : null}
          </div>
          <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirm === "cancel" ? "Cancel this approved leave?" : "Withdraw this request?"}</AlertDialogTitle>
                <AlertDialogDescription>The balance updates only after the server accepts the change.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button variant="outline" onClick={() => setConfirm(null)}>Keep request</Button>
                <Button disabled={action.isPending} onClick={() => action.mutate()}>Confirm</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </QueryBoundary>
  );
}
