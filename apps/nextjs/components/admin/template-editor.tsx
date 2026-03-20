"use client"

import { useState } from 'react'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { LIFECYCLE_STAGES } from '@life-as-code/validators'
import type { LifecycleStage } from '@life-as-code/validators'
import { Button } from '@life-as-code/ui'

import { useTRPC } from '@/trpc/react'
import { useToastStore } from '@/stores/toast-store'
import { STAGE_FIELD_CONFIGS } from '@/components/wizard/stage-fields'

const STAGE_LABEL: Record<LifecycleStage, string> = {
  problem: 'Problem',
  analysis: 'Analysis',
  requirements: 'Requirements',
  design: 'Design',
  implementation: 'Implementation',
  validation: 'Validation',
  documentation: 'Documentation',
  delivery: 'Delivery',
  support: 'Support',
}

interface TemplateEditorProps {
  template: {
    id?: string
    name: string
    description?: string
    content: Record<string, Record<string, unknown>>
  }
  onSave: () => void
  onCancel: () => void
}

export function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.showToast)

  const [localName, setLocalName] = useState(template.name)
  const [localDescription, setLocalDescription] = useState(template.description ?? '')
  const [localContent, setLocalContent] = useState<Record<string, Record<string, unknown>>>(
    template.content,
  )
  const [activeStage, setActiveStage] = useState<LifecycleStage>('problem')

  const createMutation = useMutation(trpc.features.admin.createTemplate.mutationOptions())
  const updateMutation = useMutation(trpc.features.admin.updateTemplate.mutationOptions())

  const isSaving = createMutation.isPending || updateMutation.isPending

  function handleFieldChange(stage: LifecycleStage, fieldKey: string, value: string) {
    setLocalContent((prev) => ({
      ...prev,
      [stage]: { ...prev[stage], [fieldKey]: value },
    }))
  }

  function handleSave() {
    const content = localContent
    const name = localName.trim()
    if (!name) return

    const onSuccess = () => {
      void queryClient.invalidateQueries({
        queryKey: trpc.features.admin.listTemplates.queryOptions({}).queryKey,
      })
      showToast({ type: 'success', message: 'Template saved' })
      onSave()
    }

    const onError = () => {
      showToast({ type: 'error', message: 'Failed to save template' })
    }

    if (template.id) {
      updateMutation.mutate(
        { id: template.id, name, description: localDescription.trim() || undefined, content },
        { onSuccess, onError },
      )
    } else {
      createMutation.mutate(
        { name, description: localDescription.trim() || undefined, content },
        { onSuccess, onError },
      )
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold">
          {template.id ? 'Edit Template' : 'New Template'}
        </h2>
      </div>

      {/* Name + description */}
      <div className="space-y-3">
        <div>
          <label htmlFor="template-name" className="mb-1 block text-sm font-medium">
            Name
          </label>
          <input
            id="template-name"
            type="text"
            value={localName}
            onChange={(e) => { setLocalName(e.target.value) }}
            maxLength={100}
            className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Template name"
          />
        </div>
        <div>
          <label htmlFor="template-description" className="mb-1 block text-sm font-medium">
            Description <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            id="template-description"
            type="text"
            value={localDescription}
            onChange={(e) => { setLocalDescription(e.target.value) }}
            maxLength={500}
            className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Brief description"
          />
        </div>
      </div>

      {/* Stage tabs */}
      <div>
        <div className="mb-4 flex flex-wrap gap-1 border-b border-border pb-2">
          {LIFECYCLE_STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => { setActiveStage(stage) }}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                activeStage === stage
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {STAGE_LABEL[stage]}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {STAGE_FIELD_CONFIGS[activeStage].map((field) => (
            <div key={field.key}>
              <label
                htmlFor={`field-${activeStage}-${field.key}`}
                className="mb-1 block text-sm font-medium"
              >
                {field.label}
                {field.tier === 'required' && (
                  <span className="ml-1 text-xs text-muted-foreground">(required tier)</span>
                )}
              </label>
              <textarea
                id={`field-${activeStage}-${field.key}`}
                rows={3}
                value={(localContent[activeStage]?.[field.key] as string) ?? ''}
                onChange={(e) => { handleFieldChange(activeStage, field.key, e.target.value) }}
                placeholder={field.placeholder ?? field.guidedPrompt}
                className="w-full rounded border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button type="button" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={isSaving || !localName.trim()}>
          {isSaving ? 'Saving…' : 'Save template'}
        </Button>
      </div>
    </div>
  )
}
