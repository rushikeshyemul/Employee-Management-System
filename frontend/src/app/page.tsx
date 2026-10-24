import { Suspense } from "react";
import { HomeRedirect } from "@/features/auth/home-redirect";

export default function HomePage() {
  return (
    <Suspense fallback={<main id="main" className="grid min-h-dvh place-items-center text-sm text-muted-foreground">Checking your session…</main>}>
      <HomeRedirect />
    </Suspense>
  );
}
