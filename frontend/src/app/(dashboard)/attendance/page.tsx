import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { AttendanceScreen } from "@/features/attendance/attendance-screens";

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><AttendanceScreen /></Suspense>;
}
