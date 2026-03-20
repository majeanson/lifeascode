import { headers } from 'next/headers'

import { HydrateClient, createTRPC, getQueryClient } from '@/trpc/rsc'
import { JsonEditorView } from '@/components/features/json-editor-view'

export default async function FeatureJsonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const trpc = createTRPC({ headers: await headers() })
  const queryClient = getQueryClient()

  await Promise.all([
    queryClient.prefetchQuery(trpc.features.getFeatureJson.queryOptions({ id })),
    queryClient.prefetchQuery(trpc.features.getFeature.queryOptions({ id })),
  ]).catch(console.error)

  return (
    <HydrateClient>
      <JsonEditorView featureId={id} />
    </HydrateClient>
  )
}
