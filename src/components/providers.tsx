"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api/errors";
import { AuthProvider } from "@/features/auth/auth-provider";

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

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <TooltipProvider delay={300}>
          {children}
          <Toaster position="top-right" closeButton />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
