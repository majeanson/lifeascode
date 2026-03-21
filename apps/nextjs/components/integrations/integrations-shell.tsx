"use client"

import { PageHeader } from '@/components/ui/page-header'
import { GithubIntegration } from './github-integration'

export function IntegrationsShell() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Integrations"
        description="Connect external sources to sync feature data into your workspace"
      />
      <GithubIntegration />
    </div>
  )
}
