import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { ApprovalsScreen } from "@/features/approvals/inbox-screens";

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><ApprovalsScreen /></Suspense>;
}
