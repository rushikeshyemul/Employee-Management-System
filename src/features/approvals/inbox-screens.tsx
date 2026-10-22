"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { RequestStatusBadge } from "@/components/shared/badges";
import { PageHeader, QueryBoundary } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { approvalService, notificationService } from "@/lib/api/services";
import { errorMessage } from "@/lib/api/errors";
import { formatDateTime, titleCase } from "@/lib/format";
import { useUrlState } from "@/hooks/use-url-state";
import type { ApprovalDecision } from "@/types";
import { isDemoMode } from "@/lib/demo-mode";

export function ApprovalsScreen() {
  const { get, setParams } = useUrlState();
  const query = useQuery({
    queryKey: ["approvals", { type: get("type"), employee: get("employee"), status: get("status") }],
    queryFn: () => approvalService.list({
      page_size: 50,
      type: get("type") || undefined,
      status: get("status") || undefined,
      include_closed: get("status") ? 1 : undefined,
    }),
  });
  return (
    <div>
      <PageHeader title="Approval centre" description="One inbox for leave, attendance corrections, profile changes, and HR requests." />
      <div className="mb-4 flex flex-wrap gap-2">
        <select aria-label="Request type" className="h-8 rounded-lg border bg-card px-2 text-sm" value={get("type")} onChange={(event) => setParams({ type: event.target.value || null })}>
          <option value="">All types</option>
          <option value="leave">Leave</option>
          <option value="attendance_correction">Attendance</option>
          <option value="hr_request">HR request</option>
          <option value="profile_change">Profile change</option>
        </select>
        <select aria-label="Status" className="h-8 rounded-lg border bg-card px-2 text-sm" value={get("status")} onChange={(event) => setParams({ status: event.target.value || null })}>
          <option value="">Open</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="changes_requested">Changes requested</option>
        </select>
      </div>
      <QueryBoundary isPending={query.isPending} isError={query.isError} error={query.error} data={query.data} onRetry={() => void query.refetch()} isEmpty={!query.data?.results.length} empty={<p className="text-sm text-muted-foreground">No approvals match this filter.</p>}>
        {(data) => (
          <div className="grid gap-2">
            {data.results.map((item) => (
              <Link key={item.id} href={`/approvals/${item.id}`} className="rounded-xl border bg-card p-4 hover:bg-muted/40">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{titleCase(item.type)} · {item.employee.name}</p>
                    <h2 className="font-medium">{item.title}</h2>
                  </div>
                  <RequestStatusBadge status={item.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
              </Link>
            ))}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}

export function ApprovalDetailScreen() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const query = useQuery({ queryKey: ["approvals", params.id], queryFn: () => approvalService.get(params.id) });
  const decide = useMutation({
    mutationFn: (decision: ApprovalDecision) => approvalService.decide(params.id, { decision, comment }),
    onSuccess: async (approval) => {
      toast.success(`Decision saved: ${titleCase(approval.status)}.`);
      setComment("");
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
      await queryClient.invalidateQueries({ queryKey: ["leave"] });
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <QueryBoundary isPending={query.isPending} isError={query.isError} error={query.error} data={query.data} onRetry={() => void query.refetch()}>
      {(approval) => {
        const locked = approval.status === "approved" || approval.status === "rejected";
        return (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div>
              <PageHeader title={approval.title} description={approval.summary} actions={<RequestStatusBadge status={approval.status} />} />
              <dl className="grid gap-2 rounded-xl border bg-card p-4 text-sm">
                {approval.context.map((item) => <div key={item.label}><dt className="text-xs text-muted-foreground">{item.label}</dt><dd>{item.value}</dd></div>)}
              </dl>
              <ol className="mt-4 space-y-2">
                {approval.history.map((item) => <li key={item.at} className="text-sm"><span className="font-medium">{item.actor}</span> {item.message} <span className="text-xs text-muted-foreground">{formatDateTime(item.at)}</span></li>)}
              </ol>
            </div>
            <form className="rounded-xl border bg-card p-4" onSubmit={(event) => event.preventDefault()}>
              <Label htmlFor="decision-comment">Decision comment</Label>
              <Textarea id="decision-comment" className="mt-1" value={comment} onChange={(event) => setComment(event.target.value)} disabled={locked} />
              <p className="mt-1 text-xs text-muted-foreground">Reject and request-changes require a comment.</p>
              <div className="mt-3 grid gap-2">
                <Button variant="success" disabled={locked || decide.isPending} onClick={() => decide.mutate("approve")}>Approve</Button>
                <Button variant="outline" disabled={locked || decide.isPending} onClick={() => decide.mutate("request_changes")}>Request changes</Button>
                <Button variant="destructive" disabled={locked || decide.isPending} onClick={() => decide.mutate("reject")}>Reject</Button>
              </div>
              {locked ? <p className="mt-3 text-xs text-muted-foreground">This decision is final. Refresh if the record looks stale.</p> : null}
            </form>
          </div>
        );
      }}
    </QueryBoundary>
  );
}

export function NotificationsScreen() {
  const { get, setParams } = useUrlState();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications", { category: get("category") }],
    queryFn: () => notificationService.list({ page_size: 30, category: get("category") || undefined }),
  });
  const preferences = useQuery({
    queryKey: ["notifications", "preferences"],
    queryFn: () => notificationService.preferences(),
    enabled: isDemoMode(),
  });
  const markAll = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  const markOne = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  return (
    <div>
      <PageHeader title="Notifications" description="The inbox is loaded from the API. Real-time delivery is not enabled until the backend documents a socket or event stream." actions={<Button variant="outline" onClick={() => markAll.mutate()}>Mark all read</Button>} />
      <div className="mb-3">
        <select aria-label="Category" className="h-8 rounded-lg border bg-card px-2 text-sm" value={get("category")} onChange={(event) => setParams({ category: event.target.value || null })}>
          <option value="">All categories</option>
          {["task", "leave", "attendance", "approval", "hr", "system"].map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
        </select>
      </div>
      <QueryBoundary isPending={query.isPending} isError={query.isError} error={query.error} data={query.data} onRetry={() => void query.refetch()} isEmpty={!query.data?.results.length} empty={<p className="text-sm text-muted-foreground">No notifications.</p>}>
        {(data) => (
          <ul className="divide-y rounded-xl border bg-card">
            {data.results.map((item) => (
              <li key={item.id} className={`flex items-start justify-between gap-3 p-3 ${item.read_at ? "opacity-70" : ""}`}>
                <div>
                  <p className="text-xs text-muted-foreground">{titleCase(item.category)} · {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
                  {item.href ? <Link href={item.href} className="font-medium hover:underline">{item.title}</Link> : <p className="font-medium">{item.title}</p>}
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </div>
                {item.read_at ? null : <Button size="sm" variant="outline" onClick={() => markOne.mutate(item.id)}>Mark read</Button>}
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>
      <section className="mt-4 rounded-xl border bg-card p-4 text-sm">
        <h2 className="font-medium">Notification preferences</h2>
        {isDemoMode() && preferences.data ? (
          <p className="mt-1 text-muted-foreground">In-app notifications are {preferences.data.in_app_enabled ? "on" : "off"} in this demo profile. Preference changes call PATCH /notifications/preferences/ once that endpoint is confirmed.</p>
        ) : (
          <p className="mt-1 text-muted-foreground">Preference editing is unavailable until PATCH /notifications/preferences/ is confirmed.</p>
        )}
      </section>
    </div>
  );
}
