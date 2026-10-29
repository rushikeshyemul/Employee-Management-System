"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api/errors";
import { AuthProvider } from "@/features/auth/auth-provider";
import { DEFAULT_THEME, THEME_IDS } from "@/lib/themes";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => {
          if (error instanceof ApiError && [400, 401, 403, 404, 409].includes(error.status)) {
            return false;
          }
          return count < 1;
        },
      },
    },
  });
}

function ThemeClassSync() {
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    if (theme === "black") {
      setTheme("ink");
      return;
    }
    if (!theme) return;
    document.documentElement.classList.toggle("dark", theme === "ink");
  }, [theme, setTheme]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme={DEFAULT_THEME}
      themes={THEME_IDS}
      enableSystem={false}
      disableTransitionOnChange
      storageKey="wh-theme"
    >
      <ThemeClassSync />
      <QueryClientProvider client={client}>
        <AuthProvider>
          <TooltipProvider delay={300}>
            {children}
            <Toaster position="top-right" closeButton />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
