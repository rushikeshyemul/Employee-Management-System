import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { ApprovalDetailScreen } from "@/features/approvals/inbox-screens";

export default function Page() {
  return <Suspense fallback={<PageSkeleton />}><ApprovalDetailScreen /></Suspense>;
}
