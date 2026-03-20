import { headers } from 'next/headers'

import { HydrateClient, createTRPC, getQueryClient } from '@/trpc/rsc'
import { GuideView } from '@/components/features/guide-view'

export default async function GuidePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const trpc = createTRPC({ headers: await headers() })
  const queryClient = getQueryClient()

  await queryClient.prefetchQuery(trpc.features.getFeature.queryOptions({ id })).catch(console.error)

  return (
    <HydrateClient>
      <GuideView featureId={id} />
    </HydrateClient>
  )
}
