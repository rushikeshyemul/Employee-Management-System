"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { createColumnHelper } from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTable, type DataTableFeatures, type SortingState } from "@/components/shared/data-table";
import { AssignmentBadge, PriorityBadge, StatusBadge } from "@/components/shared/badges";
import { EmptyState, PageHeader, QueryBoundary } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-provider";
import { useUrlState } from "@/hooks/use-url-state";
import { errorMessage } from "@/lib/api/errors";
import { employeeService, organisationService, taskService } from "@/lib/api/services";
import { formatDateOnly, formatDateTime, todayInTimeZone } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { TASK_STATUS_META, actionForTargetStatus, getTaskActions, statusLabel } from "@/lib/tasks/transitions";
import { splitLabels, taskSchema } from "@/lib/validation";
import type { Task, TaskAction, TaskActionDefinition, TaskStatus } from "@/types";

const helper = createColumnHelper<DataTableFeatures, Task>();

export function TasksScreen() {
  const { permissions } = useAuth();
  const { get, setParams, page } = useUrlState();
  const [open, setOpen] = useState(false);
  const ordering = get("ordering") || "-updated_at";
  const sorting: SortingState = ordering.startsWith("-")
    ? [{ id: ordering.slice(1), desc: true }]
    : ordering
      ? [{ id: ordering, desc: false }]
      : [];
  const query = useQuery({
    queryKey: ["tasks", { page, search: get("search"), status: get("status"), priority: get("priority"), assignee: get("assignee"), project: get("project"), ordering }],
    queryFn: () =>
      taskService.list({
        page,
        page_size: 20,
        search: get("search") || undefined,
        status: get("status") || undefined,
        priority: get("priority") || undefined,
        assignee: get("assignee") || undefined,
        project: get("project") || undefined,
        ordering,
        scope: "mine",
      }),
  });
  const columns = useMemo(
    () => [
      helper.accessor("key", {
        header: "ID",
        cell: ({ row }) => (
          <Link className="font-mono text-xs text-primary hover:underline" href={`/tasks/${row.original.id}`}>
            {row.original.key}
          </Link>
        ),
      }),
      helper.accessor("title", { header: "Title", cell: ({ row }) => row.original.title }),
      helper.accessor("status", { header: "Status", enableSorting: false, cell: ({ row }) => <StatusBadge status={row.original.status} /> }),
      helper.accessor("priority", { header: "Priority", enableSorting: false, cell: ({ row }) => <PriorityBadge priority={row.original.priority} /> }),
      helper.accessor("due_date", { header: "Due", id: "due_date", cell: ({ row }) => formatDateOnly(row.original.due_date) }),
      helper.display({
        id: "assignee",
        header: "Assignee",
        cell: ({ row }) => row.original.assignee?.name ?? "Unassigned",
      }),
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="My Tasks"
        description="Work assigned to you, including tasks waiting for acceptance."
        actions={
          hasPermission(permissions, "tasks.create") ? (
            <Button onClick={() => setOpen(true)}>Create task</Button>
          ) : null
        }
      />
      <TaskFilters />
      <QueryBoundary
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        data={query.data}
        onRetry={() => void query.refetch()}
        isEmpty={query.data?.results.length === 0}
        empty={<EmptyState title="No tasks" description="Tasks assigned to you will appear here." />}
      >
        {(data) => (
          <DataTable
            data={data.results}
            columns={columns}
            count={data.count}
            pageIndex={page - 1}
            pageSize={20}
            sorting={sorting}
            caption="My tasks"
            onPageChange={(index) => setParams({ page: String(index + 1) })}
            onSortingChange={(next) => {
              const first = next[0];
              setParams({ ordering: first ? `${first.desc ? "-" : ""}${first.id}` : null });
            }}
          />
        )}
      </QueryBoundary>
      <TaskFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

export function ReviewScreen() {
  const query = useQuery({
    queryKey: ["tasks", "review"],
    queryFn: () => taskService.list({ review: 1, page_size: 50 }),
  });
  return (
    <div>
      <PageHeader title="Review queue" description="Tasks submitted for your review. Approving or requesting changes is confirmed by the server." />
      <QueryBoundary isPending={query.isPending} isError={query.isError} error={query.error} data={query.data} onRetry={() => void query.refetch()} isEmpty={!query.data?.results.length} empty={<EmptyState title="Queue is clear" description="Nothing is waiting for review." />}>
        {(data) => (
          <div className="grid gap-3">
            {data.results.map((task) => (
              <Link key={task.id} href={`/tasks/${task.id}`} className="rounded-xl border bg-card p-4 hover:bg-muted/40">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{task.key}</span>
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </div>
                <h2 className="mt-2 font-medium">{task.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{task.assignee?.name ?? "Unassigned"} · due {formatDateOnly(task.due_date)}</p>
              </Link>
            ))}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}

export function BoardScreen() {
  const { user } = useAuth();
  const { get, setParams } = useUrlState();
  const [announcement, setAnnouncement] = useState("");
  const [pending, setPending] = useState<{ task: Task; action: TaskActionDefinition } | null>(null);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["tasks", "board", { search: get("search"), assignee: get("assignee"), project: get("project"), priority: get("priority") }],
    queryFn: () =>
      taskService.list({
        page_size: 100,
        search: get("search") || undefined,
        assignee: get("assignee") || undefined,
        project: get("project") || undefined,
        priority: get("priority") || undefined,
      }),
  });
  const transition = useMutation({
    mutationFn: (input: { id: string; action: TaskAction; comment?: string; to?: TaskStatus }) =>
      taskService.transition(input.id, { action: input.action, comment: input.comment }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueriesData({ queryKey: ["tasks"] });
      if (input.to) {
        queryClient.setQueriesData({ queryKey: ["tasks"] }, (current: unknown) => {
          if (!current || typeof current !== "object" || !("results" in current)) return current;
          const page = current as { results: Task[] };
          return {
            ...page,
            results: page.results.map((task) => (task.id === input.id ? { ...task, status: input.to! } : task)),
          };
        });
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error(errorMessage(error));
    },
    onSuccess: (_data, vars) => {
      setAnnouncement(`Updated task to ${vars.to ? statusLabel(vars.to) : vars.action}.`);
      toast.success("Task updated.");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function onDragEnd(event: DragEndEvent) {
    const task = query.data?.results.find((item) => item.id === event.active.id);
    const status = event.over?.id as TaskStatus | undefined;
    if (!task || !status || !user) return;
    const action = actionForTargetStatus(task, user, status);
    if (!action) {
      setAnnouncement(`Cannot move ${task.key} to ${statusLabel(status)}.`);
      toast.error("That status change is not allowed.");
      return;
    }
    if (action.requires_comment) {
      setPending({ task, action });
      setComment("");
      return;
    }
    transition.mutate({ id: task.id, action: action.action, to: action.to });
  }

  return (
    <div>
      <PageHeader title="Task board" description="Move a card only when the workflow allows it. Keyboard users can focus a card and use the move menu." />
      <TaskFilters />
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <QueryBoundary isPending={query.isPending} isError={query.isError} error={query.error} data={query.data} onRetry={() => void query.refetch()}>
        {(data) => (
          <>
            {data.count > data.results.length ? (
              <p className="mb-3 text-xs text-muted-foreground">Showing the first {data.results.length} of {data.count}. Narrow the filters to see more.</p>
            ) : null}
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3">
                {TASK_STATUS_META.map((column) => (
                  <BoardColumn
                    key={column.id}
                    status={column.id}
                    tasks={data.results.filter((task) => task.status === column.id)}
                    onMove={(task, action) => {
                      if (action.requires_comment) {
                        setPending({ task, action });
                        return;
                      }
                      transition.mutate({ id: task.id, action: action.action, to: action.to });
                    }}
                  />
                ))}
              </div>
            </DndContext>
          </>
        )}
      </QueryBoundary>
      <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pending?.action.label}</DialogTitle>
          </DialogHeader>
          <Label htmlFor="move-comment">Comment</Label>
          <Textarea id="move-comment" value={comment} onChange={(event) => setComment(event.target.value)} />
          <DialogFooter>
            <Button
              onClick={() => {
                if (!pending) return;
                transition.mutate({ id: pending.task.id, action: pending.action.action, comment, to: pending.action.to });
                setPending(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="mt-3">
        <Button variant="outline" onClick={() => setParams({ search: get("search") })} className="sr-only">Refresh filters</Button>
      </div>
    </div>
  );
}

function BoardColumn({
  status,
  tasks,
  onMove,
}: {
  status: TaskStatus;
  tasks: Task[];
  onMove: (task: Task, action: TaskActionDefinition) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section ref={setNodeRef} className={`w-[min(18rem,85vw)] shrink-0 snap-start rounded-xl border bg-muted/40 p-2 transition-shadow duration-200 sm:w-72 ${isOver ? "ring-2 ring-ring" : ""}`} aria-label={statusLabel(status)}>
      <header className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-medium">{statusLabel(status)}</h2>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </header>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onMove={onMove} />
        ))}
      </div>
    </section>
  );
}

function TaskCard({ task, onMove }: { task: Task; onMove: (task: Task, action: TaskActionDefinition) => void }) {
  const { user } = useAuth();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  const actions = user ? getTaskActions(task, user) : [];
  return (
    <article ref={setNodeRef} className={`rounded-lg border bg-card p-3 shadow-sm transition-shadow duration-200 hover:shadow-md ${isDragging ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <Link href={`/tasks/${task.id}`} className="font-mono text-xs text-primary hover:underline">{task.key}</Link>
        <button type="button" className="cursor-grab text-xs text-muted-foreground" aria-label={`Drag ${task.key}`} {...listeners} {...attributes}>
          Move
        </button>
      </div>
      <h3 className="mt-2 text-sm font-medium">
        <Link href={`/tasks/${task.id}`} className="hover:underline">{task.title}</Link>
      </h3>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
        {task.due_date ? <span className={`text-xs ${task.due_date < todayInTimeZone() && task.status !== "done" ? "text-destructive" : "text-muted-foreground"}`}>{formatDateOnly(task.due_date)}</span> : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        {task.assignee ? (
          <span className="flex items-center gap-1.5 text-xs"><UserAvatar name={task.assignee.name} size="sm" />{task.assignee.name}</span>
        ) : <span className="text-xs text-muted-foreground">Unassigned</span>}
      </div>
      {task.labels.length ? <p className="mt-2 text-[11px] text-muted-foreground">{task.labels.join(" · ")}</p> : null}
      {actions.length ? (
        <label className="mt-2 block text-xs">
          <span className="sr-only">Move {task.key}</span>
          <select
            className="h-7 w-full rounded-md border bg-background px-2"
            defaultValue=""
            onChange={(event) => {
              const action = actions.find((item) => item.action === event.target.value);
              event.target.value = "";
              if (action) onMove(task, action);
            }}
          >
            <option value="">Move to…</option>
            {actions.filter((item) => item.to).map((item) => (
              <option key={item.action} value={item.action}>{item.label}</option>
            ))}
          </select>
        </label>
      ) : null}
    </article>
  );
}

export function TaskDetailScreen() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [actionComment, setActionComment] = useState("");
  const [editing, setEditing] = useState(false);
  const query = useQuery({
    queryKey: ["tasks", params.id],
    queryFn: () => taskService.get(params.id),
  });
  const transition = useMutation({
    mutationFn: (input: { action: TaskAction; comment?: string }) => taskService.transition(params.id, input),
    onSuccess: async () => {
      toast.success("Task updated.");
      setActionComment("");
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const addComment = useMutation({
    mutationFn: () => taskService.addComment(params.id, comment),
    onSuccess: async () => {
      setComment("");
      toast.success("Comment added.");
      await queryClient.invalidateQueries({ queryKey: ["tasks", params.id] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <QueryBoundary isPending={query.isPending} isError={query.isError} error={query.error} data={query.data} onRetry={() => void query.refetch()}>
      {(task) => (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <PageHeader
              title={task.title}
              description={task.project.name}
              meta={<span className="font-mono">{task.key}</span>}
              actions={user && (hasPermission(user.permissions, "tasks.assign") || task.reporter_id === user.id) ? <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button> : null}
            />
            {task.assignment_state === "rejected" ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm" role="status">
                <p className="font-medium">Assignment rejected</p>
                <p className="mt-1">{task.rejection_reason}</p>
                <p className="mt-2 text-muted-foreground">The task is still open. Reassign it or discuss the reason with the assignee.</p>
              </div>
            ) : null}
            {task.clarification_note ? <p className="rounded-lg border bg-info/5 p-3 text-sm">Clarification: {task.clarification_note}</p> : null}
            {task.block_reason ? <p className="rounded-lg border bg-destructive/5 p-3 text-sm">Blocked: {task.block_reason}</p> : null}
            <p className="whitespace-pre-wrap text-sm leading-6">{task.description}</p>
            <section>
              <h2 className="text-sm font-medium">Comments</h2>
              <div className="mt-2 space-y-2">
                {task.comments.length === 0 ? <p className="text-sm text-muted-foreground">No comments yet.</p> : task.comments.map((item) => (
                  <article key={item.id} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{item.author.name} · {formatDateTime(item.created_at)}</p>
                    <p className="mt-1 text-sm">{item.body}</p>
                  </article>
                ))}
              </div>
              <form className="mt-3 grid gap-2" onSubmit={(event) => { event.preventDefault(); addComment.mutate(); }}>
                <Label htmlFor="comment">Add a comment</Label>
                <Textarea id="comment" value={comment} onChange={(event) => setComment(event.target.value)} />
                <Button type="submit" disabled={addComment.isPending || comment.trim().length === 0}>Comment</Button>
              </form>
            </section>
            <section>
              <h2 className="text-sm font-medium">Activity</h2>
              <ol className="mt-2 space-y-2 border-l pl-4">
                {task.events.map((event) => (
                  <li key={event.id} className="text-sm">
                    <span className="font-medium">{event.actor.name}</span> {event.message}
                    <span className="mt-0.5 block text-xs text-muted-foreground">{formatDateTime(event.created_at)}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
          <aside className="space-y-3 rounded-xl border bg-card p-4 text-sm">
            <div className="flex flex-wrap gap-2"><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} /><AssignmentBadge state={task.assignment_state} /></div>
            <Field label="Assignee" value={task.assignee?.name ?? "Unassigned"} />
            <Field label="Reporter" value={task.reporter.name} />
            <Field label="Reviewer" value={task.reviewer?.name ?? "—"} />
            <Field label="Due" value={formatDateOnly(task.due_date)} />
            <Field label="Updated" value={formatDateTime(task.updated_at)} />
            {task.subtasks.length ? (
              <div>
                <p className="text-xs text-muted-foreground">Subtasks</p>
                {task.subtasks.map((subtask) => (
                  <Link key={subtask.id} href={`/tasks/${subtask.id}`} className="mt-1 block text-primary hover:underline">{subtask.key} {subtask.title}</Link>
                ))}
              </div>
            ) : null}
            <div className="grid gap-2 border-t pt-3">
              <Label htmlFor="action-comment">Comment for the next action</Label>
              <Textarea id="action-comment" value={actionComment} onChange={(event) => setActionComment(event.target.value)} />
              {task.available_actions.map((action) => (
                <Button
                  key={action.action}
                  variant={action.action === "approve" ? "success" : action.action === "reject_assignment" ? "destructive" : "outline"}
                  disabled={transition.isPending}
                  onClick={() => transition.mutate({ action: action.action, comment: actionComment })}
                >
                  {action.label}
                </Button>
              ))}
            </div>
            <AttachmentField taskId={task.id} attachments={task.attachments} />
          </aside>
          <TaskFormDialog open={editing} onOpenChange={setEditing} task={task} />
        </div>
      )}
    </QueryBoundary>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <p><span className="block text-xs text-muted-foreground">{label}</span>{value}</p>;
}

function AttachmentField({ taskId, attachments }: { taskId: string; attachments: Task["attachments"] }) {
  const queryClient = useQueryClient();
  const upload = useMutation({
    mutationFn: (file: File) => taskService.addAttachment(taskId, file),
    onSuccess: async () => {
      toast.success("Attachment metadata saved. Demo mode does not store the file contents.");
      await queryClient.invalidateQueries({ queryKey: ["tasks", taskId] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <div>
      <Label htmlFor="attachment">Attachment</Label>
      <Input id="attachment" type="file" className="mt-1" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) upload.mutate(file);
      }} />
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
        {attachments.map((file) => <li key={file.id}>{file.name} ({Math.ceil(file.size / 1024)} KB)</li>)}
      </ul>
    </div>
  );
}

function TaskFilters() {
  const { get, setParams } = useUrlState();
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => organisationService.projects() });
  const people = useQuery({ queryKey: ["people"], queryFn: () => employeeService.people() });
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      <Input aria-label="Search tasks" placeholder="Search" defaultValue={get("search")} onChange={(event) => {
        const value = event.target.value;
        window.clearTimeout(window.taskSearchTimer);
        window.taskSearchTimer = window.setTimeout(() => setParams({ search: value || null }), 300);
      }} />
      <Filter value={get("status") || "all"} label="Status" onChange={(value) => setParams({ status: value === "all" ? null : value })} options={[["all", "All statuses"], ...TASK_STATUS_META.map((item) => [item.id, item.label] as [string, string])]} />
      <Filter value={get("priority") || "all"} label="Priority" onChange={(value) => setParams({ priority: value === "all" ? null : value })} options={[["all", "All priorities"], ["low", "Low"], ["medium", "Medium"], ["high", "High"], ["urgent", "Urgent"]]} />
      <Filter value={get("project") || "all"} label="Project" onChange={(value) => setParams({ project: value === "all" ? null : value })} options={[["all", "All projects"], ...(projects.data ?? []).map((project) => [project.id, project.name] as [string, string])]} />
      <Filter value={get("assignee") || "all"} label="Assignee" onChange={(value) => setParams({ assignee: value === "all" ? null : value })} options={[["all", "All assignees"], ...(people.data ?? []).map((person) => [person.id, `${person.first_name} ${person.last_name}`] as [string, string])]} />
    </div>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? "all")}>
      <SelectTrigger className="w-full" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map(([optionValue, optionLabel]) => (
          <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type TaskFormValues = z.infer<typeof taskSchema>;

export function TaskFormDialog({ open, onOpenChange, task }: { open: boolean; onOpenChange: (open: boolean) => void; task?: Task }) {
  const queryClient = useQueryClient();
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => organisationService.projects(), enabled: open });
  const people = useQuery({ queryKey: ["people"], queryFn: () => employeeService.people(), enabled: open });
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    values: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      project_id: task?.project_id ?? "",
      assignee_id: task?.assignee_id ?? "",
      reviewer_id: task?.reviewer_id ?? "",
      priority: task?.priority ?? "medium",
      start_date: task?.start_date ?? "",
      due_date: task?.due_date ?? "",
      labels: task?.labels.join(", ") ?? "",
      parent_id: task?.parent_id ?? "",
      status: task?.status === "backlog" ? "backlog" : "todo",
    },
  });
  const save = useMutation({
    mutationFn: (values: TaskFormValues) => {
      const payload = {
        title: values.title,
        description: values.description,
        project_id: values.project_id,
        assignee_id: values.assignee_id,
        reviewer_id: values.reviewer_id || null,
        priority: values.priority,
        start_date: values.start_date || null,
        due_date: values.due_date,
        labels: splitLabels(values.labels),
        parent_id: values.parent_id || null,
      };
      return task
        ? taskService.update(task.id, payload)
        : taskService.create({ ...payload, status: values.status });
    },
    onSuccess: async () => {
      toast.success(task ? "Task updated." : "Task created.");
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{task ? "Edit task" : "Create task"}</DialogTitle></DialogHeader>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
          <div className="sm:col-span-2 grid gap-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" {...form.register("title")} aria-invalid={Boolean(form.formState.errors.title)} />
            <ErrorText message={form.formState.errors.title?.message} />
          </div>
          <div className="sm:col-span-2 grid gap-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea id="task-description" {...form.register("description")} />
            <ErrorText message={form.formState.errors.description?.message} />
          </div>
          <SelectField label="Project" value={form.watch("project_id")} onChange={(value) => form.setValue("project_id", value, { shouldValidate: true })} options={(projects.data ?? []).map((project) => [project.id, project.name])} error={form.formState.errors.project_id?.message} />
          <SelectField label="Assignee" value={form.watch("assignee_id")} onChange={(value) => form.setValue("assignee_id", value, { shouldValidate: true })} options={(people.data ?? []).map((person) => [person.id, `${person.first_name} ${person.last_name}`])} error={form.formState.errors.assignee_id?.message} />
          <SelectField label="Reviewer" value={form.watch("reviewer_id") || "none"} onChange={(value) => form.setValue("reviewer_id", value === "none" ? "" : value)} options={[["none", "No reviewer"], ...(people.data ?? []).map((person) => [person.id, `${person.first_name} ${person.last_name}`] as [string, string])]} />
          <SelectField label="Priority" value={form.watch("priority")} onChange={(value) => form.setValue("priority", value as Task["priority"])} options={[["low", "Low"], ["medium", "Medium"], ["high", "High"], ["urgent", "Urgent"]]} />
          <div className="grid gap-1.5">
            <Label htmlFor="start">Start date</Label>
            <Input id="start" type="date" {...form.register("start_date")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="due">Due date</Label>
            <Input id="due" type="date" {...form.register("due_date")} aria-invalid={Boolean(form.formState.errors.due_date)} />
            <ErrorText message={form.formState.errors.due_date?.message} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="labels">Labels</Label>
            <Input id="labels" placeholder="platform, payroll" {...form.register("labels")} />
          </div>
          {!task ? (
            <SelectField label="Initial status" value={form.watch("status")} onChange={(value) => form.setValue("status", value as "todo" | "backlog")} options={[["todo", "To Do"], ["backlog", "Backlog"]]} />
          ) : null}
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : task ? "Save changes" : "Create task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SelectField({ label, value, onChange, options, error }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][]; error?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(next) => next && onChange(next)}>
        <SelectTrigger className="w-full" aria-label={label}><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}
        </SelectContent>
      </Select>
      <ErrorText message={error} />
    </div>
  );
}

function ErrorText({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive" role="alert">{message}</p> : null;
}

declare global {
  interface Window {
    taskSearchTimer?: number;
  }
}
