'use client'

import { ThemeProvider } from '@life-as-code/ui'
import { QueryClientProvider } from '@tanstack/react-query'

import { ThemeApplier } from '@/components/theme/theme-applier'
import { getQueryClient } from '@/lib/query-client'
import { TRPCReactProvider } from '@/trpc/react'

export function Providers({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const queryClient = getQueryClient()

  return (
    <ThemeProvider attribute='class' defaultTheme='dark' disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TRPCReactProvider>
          {children}
        </TRPCReactProvider>
      </QueryClientProvider>
      <ThemeApplier />
    </ThemeProvider>
  )
}
