"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export function useUrlState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const setParams = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      if (resetPage && !("page" in updates)) next.delete("page");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const pageToken = searchParams.get("page") ?? "1";

  return useMemo(
    () => ({
      searchParams,
      setParams,
      page: Math.max(1, Number(pageToken) || 1),
      get: (key: string) => searchParams.get(key) ?? "",
    }),
    [pageToken, searchParams, setParams],
  );
}
