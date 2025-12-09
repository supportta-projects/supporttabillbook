'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds - reduced for faster updates
            gcTime: 2 * 60 * 1000, // 2 minutes - reduced for memory efficiency
            refetchOnWindowFocus: false, // Prevent refetch on window focus globally
            refetchOnMount: false, // Prevent refetch on mount if data exists
            refetchOnReconnect: false, // Prevent refetch on reconnect
            retry: 1, // Reduce retries globally
            retryDelay: 100, // Faster retry
          },
          mutations: {
            retry: false, // Don't retry mutations
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

