import type { ReactNode } from "react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/errors";

export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-balance text-foreground sm:text-xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
        ) : null}
        {meta ? <div className="mt-2 text-xs text-muted-foreground">{meta}</div> : null}
      </div>
      {actions ? <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">{actions}</div> : null}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <div className="mb-3 text-muted-foreground">{icon ?? <Inbox className="size-6" />}</div>
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = "This page could not be loaded",
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-card px-6 py-10 text-center" role="alert">
      <AlertCircle className="mx-auto size-6 text-destructive" />
      <h2 className="mt-3 text-sm font-medium">{title}</h2>
      <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">{errorMessage(error)}</p>
      {onRetry ? (
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          <RefreshCw />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function QueryBoundary<T>({
  isPending,
  isError,
  error,
  onRetry,
  isEmpty,
  empty,
  children,
  data,
}: {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  empty?: ReactNode;
  data: T | undefined;
  children: (data: T) => ReactNode;
}) {
  if (isPending) return <PageSkeleton />;
  if (isError) return <ErrorState error={error} onRetry={onRetry} />;
  if (!data || isEmpty) return empty ?? <EmptyState title="Nothing here yet" description="There is no data for the current filters." />;
  return children(data);
}

export function AccessDenied() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border bg-card px-6 py-12 text-center">
      <h1 className="text-lg font-semibold">Access denied</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your account does not have permission to open this page. If you need access, ask an administrator. The server remains the source of truth for authorisation.
      </p>
    </div>
  );
}

export function PreviewBanner({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{children}</p>
    </div>
  );
}
