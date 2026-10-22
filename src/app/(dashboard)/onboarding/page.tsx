import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { OnboardingScreen } from "@/features/organisation/organisation-screens";

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><OnboardingScreen /></Suspense>;
}
