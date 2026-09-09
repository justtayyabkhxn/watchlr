"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            // keep fetched pages alive across navigation so going back to
            // library/search/dashboard renders instantly from cache
            gcTime: 15 * 60_000,
            refetchOnWindowFocus: false,
            /* Two tries, quickly. The default ladder is three retries with
               exponential backoff, so a dead endpoint spends ~7s looking like
               it's still loading before anything says otherwise. */
            retry: 2,
            retryDelay: (attempt) => Math.min(600 * 2 ** attempt, 2_000),
            // Coming back from a dead tunnel should heal the page by itself.
            refetchOnReconnect: true,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
