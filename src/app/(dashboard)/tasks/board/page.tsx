import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { BoardScreen } from "@/features/tasks/task-screens";

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><BoardScreen /></Suspense>;
}
