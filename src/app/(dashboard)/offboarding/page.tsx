import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { OffboardingScreen } from "@/features/organisation/organisation-screens";

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><OffboardingScreen /></Suspense>;
}
