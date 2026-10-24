import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { EmployeeFormScreen } from "@/features/employees/employee-screens";

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><EmployeeFormScreen mode="create" /></Suspense>;
}
