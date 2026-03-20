import { headers } from 'next/headers'

import { HydrateClient, createTRPC, getQueryClient } from '@/trpc/rsc'
import { FeatureTree } from '@/components/features/feature-tree'

export default async function TreePage() {
  const trpc = createTRPC({ headers: await headers() })
  await getQueryClient().prefetchQuery(trpc.features.listRootFeatures.queryOptions()).catch(console.error)

  return (
    <HydrateClient>
      <div className="flex h-[calc(100dvh-3rem)] flex-col px-4 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Feature Tree</h1>
            <p className="text-xs text-muted-foreground">Lineage and hierarchy — select a node to inspect</p>
          </div>
        </div>
        <FeatureTree />
      </div>
    </HydrateClient>
  )
}
