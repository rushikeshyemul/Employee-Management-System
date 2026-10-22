import { Suspense } from "react";

export const instant = false;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">WH</span>
          <div>
            <p className="text-sm font-semibold">Workforce Hub</p>
            <p className="text-xs text-muted-foreground">Sign in to continue</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
            {children}
          </Suspense>
        </div>
      </div>
    </main>
  );
}
