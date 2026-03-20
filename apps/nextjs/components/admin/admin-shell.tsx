"use client"

import { useState } from 'react'

import { PageHeader } from '@/components/ui/page-header'
import { TabStrip } from '@/components/ui/tab-strip'
import type { TabDef } from '@/components/ui/tab-strip'

import { SchemaEditor } from './schema-editor'
import { TemplateManager } from './template-manager'
import { ExportPanel } from './export-panel'
import { SeedPanel } from './seed-panel'

const ADMIN_TABS = [
  { key: 'schema',    label: 'Schema' },
  { key: 'templates', label: 'Templates' },
  { key: 'export',    label: 'Export' },
  { key: 'dev',       label: 'Dev' },
] as const satisfies readonly TabDef<string>[]

type AdminTab = typeof ADMIN_TABS[number]['key']

/**
 * Tabbed admin shell — wraps Schema, Templates, Export, and Dev under a single page.
 * Previously these were separate routes (/admin and /admin/templates).
 *
 * Reuses: PageHeader, TabStrip (same pattern as FeatureDetailView).
 */
export function AdminShell() {
  const [activeTab, setActiveTab] = useState<AdminTab>('schema')

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Admin"
        description="Schema management, feature templates, and data export"
      />

      <TabStrip
        tabs={ADMIN_TABS}
        active={activeTab}
        onSwitch={setActiveTab}
        ariaLabel="Admin sections"
      />

      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'schema'    && <SchemaEditor />}
        {activeTab === 'templates' && <TemplateManager />}
        {activeTab === 'export'    && <ExportPanel />}
        {activeTab === 'dev'       && <SeedPanel />}
      </div>
    </div>
  )
}
