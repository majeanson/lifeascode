import { headers } from 'next/headers'

import { HydrateClient, createTRPC, getQueryClient } from '@/trpc/rsc'
import { TimelineView } from '@/components/features/timeline-view'

export const metadata = { title: 'Timeline — life-as-code' }

export default async function TimelinePage() {
  const trpc = createTRPC({ headers: await headers() })
  await getQueryClient().prefetchQuery(trpc.features.getTimeline.queryOptions({ limit: 500 })).catch(console.error)
  return (
    <HydrateClient>
      <TimelineView />
    </HydrateClient>
  )
}
