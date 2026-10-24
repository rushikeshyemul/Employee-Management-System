import { Suspense } from "react";
import { ResetPasswordForm } from "@/features/auth/account-forms";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading reset form…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
