"use client"

import { useEffect } from 'react'

import { useRouter } from 'next/navigation'

import { useMutation, useQuery } from '@tanstack/react-query'

import type { FeatureContent } from '@life-as-code/validators'

import { useTRPC } from '@/trpc/react'
import { TemplatePicker } from '@/components/admin/template-picker'

export default function NewFeaturePage() {
  const router = useRouter()
  const trpc = useTRPC()

  const { data: templates, isPending: templatesLoading } = useQuery(
    trpc.features.admin.listTemplates.queryOptions({}),
  )

  const createMutation = useMutation(
    trpc.features.create.mutationOptions({
      onSuccess: (feature) => {
        // Land on the detail view with the Edit tab pre-selected
        router.push(`/features/${feature.id}?edit=1`)
      },
    }),
  )

  // Auto-create when no templates exist (preserve existing UX)
  useEffect(() => {
    if (!templatesLoading && (templates === undefined || templates.length === 0)) {
      createMutation.mutate({ problemStatement: '', reporterContext: '' })
    }
    // createMutation is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatesLoading, templates])

  function handlePickerSelect(templateContent?: FeatureContent) {
    createMutation.mutate({ problemStatement: '', templateContent })
  }

  if (createMutation.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-destructive">
          Failed to create feature. Please try again.
        </span>
      </div>
    )
  }

  if (templatesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    )
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Creating feature...</span>
      </div>
    )
  }

  return (
    <TemplatePicker
      templates={templates}
      onCreate={handlePickerSelect}
      isCreating={createMutation.isPending}
    />
  )
}
