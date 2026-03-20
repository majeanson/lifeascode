import { headers } from 'next/headers'

import { HydrateClient, createTRPC, getQueryClient } from '@/trpc/rsc'
import { AdminShell } from '@/components/admin/admin-shell'

export default async function AdminPage() {
  const trpc = createTRPC({ headers: await headers() })
  const queryClient = getQueryClient()

  // Prefetch schema and templates — features list is deferred to export panel client-side
  await Promise.all([
    queryClient.prefetchQuery(trpc.features.admin.getActiveSchema.queryOptions({})),
    queryClient.prefetchQuery(trpc.features.admin.listTemplates.queryOptions({})),
  ]).catch(console.error)

  return (
    <HydrateClient>
      <AdminShell />
    </HydrateClient>
  )
}
