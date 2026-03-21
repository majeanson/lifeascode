import { HydrateClient } from '@/trpc/rsc'
import { IntegrationsShell } from '@/components/integrations/integrations-shell'

export default function IntegrationsPage() {
  return (
    <HydrateClient>
      <IntegrationsShell />
    </HydrateClient>
  )
}
