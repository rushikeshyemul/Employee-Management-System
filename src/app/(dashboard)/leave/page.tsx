import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { LeaveScreen } from "@/features/leave/leave-screens";

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><LeaveScreen /></Suspense>;
}
