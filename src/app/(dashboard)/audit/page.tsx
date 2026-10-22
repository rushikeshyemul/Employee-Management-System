import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { AuditScreen } from "@/features/organisation/organisation-screens";

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><AuditScreen /></Suspense>;
}
