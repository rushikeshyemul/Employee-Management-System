import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { DepartmentsScreen } from "@/features/organisation/organisation-screens";

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><DepartmentsScreen /></Suspense>;
}
