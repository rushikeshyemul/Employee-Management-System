import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { EmployeesScreen } from "@/features/employees/employee-screens";

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><EmployeesScreen /></Suspense>;
}
