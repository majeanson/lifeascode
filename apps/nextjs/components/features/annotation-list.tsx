"use client"

import { useEffect, useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '@life-as-code/ui'
import type { AnnotationEntry } from '@life-as-code/validators'

import { useToastStore } from '@/stores/toast-store'
import { useTRPC } from '@/trpc/react'
import { AnnotationIcon, type AnnotationType } from './annotation-icon'

/** Infer a rough annotation type from the text content for icon display. */
function inferAnnotationType(annotation: AnnotationEntry): AnnotationType {
  if (annotation.flagged) return 'warning'
  const lower = annotation.text.toLowerCase()
  if (lower.includes('decision') || lower.includes('decided') || lower.includes('chose')) return 'decision'
  if (lower.includes('warning') || lower.includes('careful') || lower.includes('danger')) return 'warning'
  if (lower.includes('assume') || lower.includes('assumption')) return 'assumption'
  if (lower.includes('learned') || lower.includes('lesson') || lower.includes('retrospect')) return 'lesson'
  if (lower.includes('breaking') || lower.includes('breaks') || lower.includes('deprecated')) return 'breaking-change'
  if (lower.includes('?') || lower.includes('question') || lower.includes('todo')) return 'question'
  if (lower.includes('tech debt') || lower.includes('shortcut') || lower.includes('hacky')) return 'tech-debt'
  return 'decision'
}

interface AnnotationListProps {
  featureId: string
}

export function AnnotationList({ featureId }: AnnotationListProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.showToast)

  const { data: annotations = [], isPending } = useQuery(
    trpc.features.listAnnotations.queryOptions({ id: featureId }),
  )

  const [showForm, setShowForm] = useState(false)
  const [newText, setNewText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (showForm) textareaRef.current?.focus()
  }, [showForm])

  const addAnnotationMutation = useMutation(trpc.features.addAnnotation.mutationOptions())
  const flagAnnotationMutation = useMutation(trpc.features.flagAnnotation.mutationOptions())

  function invalidateBoth() {
    void queryClient.invalidateQueries({
      queryKey: trpc.features.listAnnotations.queryOptions({ id: featureId }).queryKey,
    })
    void queryClient.invalidateQueries({
      queryKey: trpc.features.getFeature.queryOptions({ id: featureId }).queryKey,
    })
  }

  function handleSubmit() {
    if (!newText.trim()) return
    addAnnotationMutation.mutate(
      { featureId, text: newText.trim() },
      {
        onSuccess: () => {
          invalidateBoth()
          showToast({ type: 'success', message: 'Annotation added' })
          setNewText('')
          setShowForm(false)
        },
        onError: () => {
          showToast({ type: 'error', message: 'Failed to add annotation' })
        },
      },
    )
  }

  function handleFlag(annotation: AnnotationEntry) {
    flagAnnotationMutation.mutate(
      { featureId, annotationId: annotation.id, flagged: !annotation.flagged },
      {
        onSuccess: () => {
          invalidateBoth()
        },
        onError: () => {
          showToast({ type: 'error', message: 'Failed to update flag' })
        },
      },
    )
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit()
    }
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-16 animate-pulse rounded bg-muted" />
        <div className="h-16 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {annotations.length === 0 && !showForm && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            No annotations yet — be the first to add one
          </p>
          <Button type="button" variant="default" size="sm" onClick={() => { setShowForm(true) }}>
            Add annotation
          </Button>
        </div>
      )}

      {annotations.length > 0 && (
        <ul role="list" className="flex flex-col gap-4">
          {annotations.map((annotation) => (
            <li
              key={annotation.id}
              role="listitem"
              className={`flex gap-3 rounded-lg border p-4 ${
                annotation.flagged
                  ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
                  : 'border-border bg-background'
              }`}
            >
              {/* Annotation type icon */}
              <AnnotationIcon
                type={inferAnnotationType(annotation)}
                className="mt-1 shrink-0 text-base"
              />

              {/* Avatar */}
              <div
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
              >
                {annotation.actor[0]?.toUpperCase() ?? '?'}
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">{annotation.actor}</span>
                    <time
                      dateTime={annotation.timestamp}
                      className="text-xs text-muted-foreground"
                    >
                      {new Date(annotation.timestamp).toLocaleString()}
                    </time>
                  </div>
                  <button
                    type="button"
                    aria-pressed={annotation.flagged}
                    aria-label={annotation.flagged ? 'Unflag this annotation' : 'Flag this annotation'}
                    onClick={() => { handleFlag(annotation) }}
                    className={`text-base leading-none transition-colors ${
                      annotation.flagged
                        ? 'text-amber-600 hover:text-amber-700'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    ⚑
                  </button>
                </div>
                <p className="text-sm text-foreground">{annotation.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {annotations.length > 0 && !showForm && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => { setShowForm(true) }}
        >
          Add annotation
        </Button>
      )}

      {showForm && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <textarea
            ref={textareaRef}
            value={newText}
            onChange={(e) => { setNewText(e.target.value) }}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder="Add a note… (Cmd+Enter to post)"
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={!newText.trim() || addAnnotationMutation.isPending}
              onClick={handleSubmit}
            >
              {addAnnotationMutation.isPending ? 'Posting…' : 'Post'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setShowForm(false); setNewText('') }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
