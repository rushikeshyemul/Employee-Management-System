import { Suspense } from "react";
import { InviteScreen } from "@/features/auth/account-forms";

export default function InvitePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading invitation…</p>}>
      <InviteScreen />
    </Suspense>
  );
}
