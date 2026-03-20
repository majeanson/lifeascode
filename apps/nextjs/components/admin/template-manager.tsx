"use client"

import { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { FeatureTemplate } from '@life-as-code/db'
import { Button } from '@life-as-code/ui'

import { useTRPC } from '@/trpc/react'
import { useToastStore } from '@/stores/toast-store'
import { TemplateEditor } from '@/components/admin/template-editor'

function countFields(content: unknown): number {
  const contentMap = content as Record<string, Record<string, unknown>> | null
  if (!contentMap) return 0
  return Object.values(contentMap).reduce<number>((total, stage) => {
    if (typeof stage !== 'object' || stage === null) return total
    const filled = Object.values(stage).filter(
      (v) => typeof v === 'string' && v.trim().length > 0,
    ).length
    return total + filled
  }, 0)
}

type EditingTemplate = {
  id?: string
  name: string
  description?: string
  content: Record<string, Record<string, unknown>>
}

export function TemplateManager() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.showToast)

  const { data: templates, isPending } = useQuery(
    trpc.features.admin.listTemplates.queryOptions({}),
  )

  const cloneMutation = useMutation(trpc.features.admin.cloneTemplate.mutationOptions())
  const deleteMutation = useMutation(trpc.features.admin.deleteTemplate.mutationOptions())

  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleClone(template: FeatureTemplate) {
    cloneMutation.mutate(
      { id: template.id },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: trpc.features.admin.listTemplates.queryOptions({}).queryKey,
          })
          showToast({ type: 'success', message: 'Template cloned' })
        },
        onError: () => {
          showToast({ type: 'error', message: 'Failed to clone template' })
        },
      },
    )
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: trpc.features.admin.listTemplates.queryOptions({}).queryKey,
          })
          setDeletingId(null)
          showToast({ type: 'success', message: 'Template deleted' })
        },
        onError: () => {
          showToast({ type: 'error', message: 'Failed to delete template' })
        },
      },
    )
  }

  if (editingTemplate) {
    return (
      <TemplateEditor
        template={editingTemplate}
        onSave={() => { setEditingTemplate(null) }}
        onCancel={() => { setEditingTemplate(null) }}
      />
    )
  }

  if (isPending) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded bg-muted" />
          <div className="h-16 animate-pulse rounded bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feature Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create templates to pre-populate new features with consistent field structures.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditingTemplate({ name: '', description: '', content: {} })
          }}
        >
          Create new template
        </Button>
      </div>

      {templates && templates.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No templates yet. Create one to give your team a consistent starting point.
        </p>
      )}

      {templates && templates.length > 0 && (
        <ul className="space-y-3">
          {templates.map((template) => (
            <li
              key={template.id}
              className="rounded border border-border px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-0.5">
                  <p className="font-medium">{template.name}</p>
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {countFields(template.content)} fields pre-populated ·{' '}
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {deletingId === template.id ? (
                    <>
                      <span className="text-sm text-destructive">Confirm delete?</span>
                      <button
                        type="button"
                        onClick={() => { setDeletingId(null) }}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => { handleDelete(template.id) }}
                        disabled={deleteMutation.isPending}
                        className="text-sm text-destructive hover:underline disabled:opacity-50"
                      >
                        Yes, delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTemplate({
                            id: template.id,
                            name: template.name,
                            description: template.description ?? undefined,
                            content: template.content as Record<string, Record<string, unknown>>,
                          })
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => { handleClone(template) }}
                        disabled={cloneMutation.isPending}
                        className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                      >
                        Clone
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDeletingId(template.id) }}
                        className="text-sm text-muted-foreground hover:text-destructive"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
