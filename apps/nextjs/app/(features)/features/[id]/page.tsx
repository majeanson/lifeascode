import { headers } from 'next/headers'

import { HydrateClient, createTRPC, getQueryClient } from '@/trpc/rsc'
import { FeatureDetailView } from '@/components/features/feature-detail-view'

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const trpc = createTRPC({ headers: await headers() })
  const queryClient = getQueryClient()

  // Fetch the feature first so we can conditionally prefetch the parent
  try {
    await queryClient.prefetchQuery(trpc.features.getFeature.queryOptions({ id }))

    const featureData = queryClient.getQueryData(
      trpc.features.getFeature.queryOptions({ id }).queryKey,
    )

    await Promise.all([
      featureData?.parentId
        ? queryClient.prefetchQuery(trpc.features.getFeature.queryOptions({ id: featureData.parentId }))
        : Promise.resolve(),
      queryClient.prefetchQuery(trpc.features.listAnnotations.queryOptions({ id })),
      queryClient.prefetchQuery(trpc.events.listFeatureEvents.queryOptions({ id, cursor: 0 })),
      queryClient.prefetchQuery(trpc.features.getLineage.queryOptions({ id })),
    ])
  } catch (err) {
    console.error('[FeatureDetailPage] DB prefetch failed:', err)
  }

  return (
    <HydrateClient>
      <FeatureDetailView featureId={id} />
    </HydrateClient>
  )
}
