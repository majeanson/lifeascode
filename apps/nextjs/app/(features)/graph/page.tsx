import { headers } from 'next/headers'

import { HydrateClient, createTRPC, getQueryClient } from '@/trpc/rsc'
import { FeatureGraph } from '@/components/features/feature-graph'

export default async function GraphPage() {
  const trpc = createTRPC({ headers: await headers() })
  await getQueryClient().prefetchQuery(trpc.features.listAllForGraph.queryOptions()).catch(console.error)

  return (
    <HydrateClient>
      <div className="flex h-[calc(100dvh-3rem)] flex-col px-4 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Feature Graph</h1>
            <p className="text-xs text-muted-foreground">Force-directed lineage map — drag nodes, scroll to zoom, click to inspect</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
          <FeatureGraph />
        </div>
      </div>
    </HydrateClient>
  )
}
