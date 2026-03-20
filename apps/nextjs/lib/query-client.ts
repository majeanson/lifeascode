import { cache } from 'react'

import { createQueryClient } from '@life-as-code/lib/create-query-client'
import type { QueryClient } from '@tanstack/react-query'

// Server: React cache() memoises per request so the RSC prefetch and the
// client-component SSR pass share the exact same QueryClient instance.
const getServerQueryClient = cache(createQueryClient)

// Client: module-level singleton so the QueryClient survives navigation.
let clientSingleton: QueryClient | undefined

export const getQueryClient = () => {
  if (typeof window === 'undefined') {
    return getServerQueryClient()
  }
  return (clientSingleton ??= createQueryClient())
}
