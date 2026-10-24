import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { DashboardScreen } from "@/features/dashboard/dashboard-screen";

export const instant = false;

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><DashboardScreen /></Suspense>;
}
