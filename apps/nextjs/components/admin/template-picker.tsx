"use client"

import type { FeatureTemplate } from '@life-as-code/db'
import type { FeatureContent } from '@life-as-code/validators'

interface TemplatePickerProps {
  templates: FeatureTemplate[]
  onCreate: (templateContent?: FeatureContent) => void
  isCreating: boolean
}

export function TemplatePicker({ templates, onCreate, isCreating }: TemplatePickerProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">New Feature</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose a starting point:</p>
        </div>

        <div className="space-y-3">
          {/* Start blank */}
          <button
            type="button"
            onClick={() => { onCreate() }}
            disabled={isCreating}
            className="w-full rounded border border-border px-4 py-3 text-left transition-colors hover:border-primary hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <p className="font-medium">Start blank</p>
            <p className="text-sm text-muted-foreground">Begin with an empty feature form</p>
          </button>

          {/* Template cards */}
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => { onCreate(template.content as FeatureContent) }}
              disabled={isCreating}
              className="w-full rounded border border-border px-4 py-3 text-left transition-colors hover:border-primary hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <p className="font-medium">{template.name}</p>
              {template.description && (
                <p className="text-sm text-muted-foreground">{template.description}</p>
              )}
            </button>
          ))}
        </div>

        {isCreating && (
          <div className="flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Creating feature…</span>
          </div>
        )}
      </div>
    </div>
  )
}
