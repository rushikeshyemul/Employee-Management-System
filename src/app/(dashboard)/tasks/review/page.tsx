import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { ReviewScreen } from "@/features/tasks/task-screens";

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><ReviewScreen /></Suspense>;
}
