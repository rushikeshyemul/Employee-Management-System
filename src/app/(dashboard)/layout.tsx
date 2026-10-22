import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";

export const instant = false;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground">
          Checking your session…
        </div>
      }
    >
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
