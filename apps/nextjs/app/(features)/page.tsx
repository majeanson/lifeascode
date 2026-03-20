import { Suspense } from 'react'
import { headers } from 'next/headers'

import { HydrateClient, createTRPC, getQueryClient } from '@/trpc/rsc'
import { HomeOverview } from '@/components/features/home-overview'
import { getCachedStats } from '@/lib/cached-stats'

function HomeOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="h-12 w-48 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-muted" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  )
}

export default async function HomePage() {
  const trpc = createTRPC({ headers: await headers() })
  const queryClient = getQueryClient()

  // Stats come from the Next.js page cache (60s TTL, tag-invalidated on mutations).
  // Seed React Query so the client never needs to re-fetch on first render.
  // Wrapped in try/catch so a DB outage degrades gracefully instead of crashing the page.
  try {
    const [cachedStats] = await Promise.all([
      getCachedStats(),
      queryClient.prefetchQuery(trpc.features.listRecent.queryOptions()),
    ])
    queryClient.setQueryData(trpc.features.getStats.queryOptions().queryKey, cachedStats)
  } catch (err) {
    console.error('[HomePage] DB prefetch failed, rendering without server data:', err)
  }

  return (
    <HydrateClient>
      <Suspense fallback={<HomeOverviewSkeleton />}>
        <HomeOverview />
      </Suspense>
    </HydrateClient>
  )
}
