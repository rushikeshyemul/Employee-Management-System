import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { LeaveDetailScreen } from "@/features/leave/leave-screens";

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><LeaveDetailScreen /></Suspense>;
}
