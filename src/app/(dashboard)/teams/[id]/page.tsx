import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { TeamScreen } from "@/features/organisation/organisation-screens";

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><TeamScreen /></Suspense>;
}
