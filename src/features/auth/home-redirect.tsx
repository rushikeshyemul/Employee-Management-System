"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";

export function HomeRedirect() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
    if (status === "anonymous") router.replace("/login");
  }, [router, status]);

  return (
    <main id="main" className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
      Checking your session…
    </main>
  );
}
