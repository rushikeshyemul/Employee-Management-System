import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { ReportsScreen } from "@/features/reports/reports-screen";

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><ReportsScreen /></Suspense>;
}
