import { Suspense } from "react";
import { ThemePicker } from "@/components/theme/theme-picker";

export const instant = false;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="relative min-h-dvh overflow-y-auto bg-background px-4 py-8">
      <div className="absolute top-3 right-3">
        <ThemePicker />
      </div>
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-5 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">WH</span>
          <div>
            <p className="text-sm font-semibold">Workforce Hub</p>
            <p className="text-xs text-muted-foreground">Employee operations</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
            {children}
          </Suspense>
        </div>
      </div>
    </main>
  );
}
