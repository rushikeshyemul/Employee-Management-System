import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { TasksScreen } from "@/features/tasks/task-screens";

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><TasksScreen /></Suspense>;
}
