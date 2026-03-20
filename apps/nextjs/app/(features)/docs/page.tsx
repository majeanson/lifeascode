import { headers } from 'next/headers'

import { HydrateClient, createTRPC, getQueryClient } from '@/trpc/rsc'
import { DocsHub } from '@/components/docs/docs-hub'

export const metadata = {
  title: 'Documentation',
  description: 'life-as-code documentation — Getting Started, CLI Reference, Configuration, and Schema.',
}

export default async function DocsPage() {
  const trpc = createTRPC({ headers: await headers() })
  await getQueryClient().prefetchQuery(trpc.features.listFeatures.queryOptions({ limit: 500 })).catch(console.error)
  return (
    <HydrateClient>
      <div className="p-6">
        <DocsHub />
      </div>
    </HydrateClient>
  )
}
