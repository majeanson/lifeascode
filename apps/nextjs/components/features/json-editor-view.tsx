"use client"

import { useCallback, useEffect, useRef, useState } from 'react'

import dynamic from 'next/dynamic'
import Link from 'next/link'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { json } from '@codemirror/lang-json'
import type { ReactCodeMirrorProps } from '@uiw/react-codemirror'

import { Button, SaveIndicator } from '@life-as-code/ui'
import type { SaveIndicatorState } from '@life-as-code/ui'
import { FeatureContentSchema } from '@life-as-code/validators'

import { useTRPC } from '@/trpc/react'
import { useToastStore } from '@/stores/toast-store'
import { SpawnDialog } from '@/components/features/spawn-dialog'

const CodeMirror = dynamic<ReactCodeMirrorProps>(
  () => import('@uiw/react-codemirror').then((m) => m.default),
  { ssr: false, loading: () => <div className="h-full animate-pulse bg-muted rounded-md" /> },
)

interface JsonEditorViewProps {
  featureId: string
}

export function JsonEditorView({ featureId }: JsonEditorViewProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.showToast)

  const { data: jsonData } = useQuery(trpc.features.getFeatureJson.queryOptions({ id: featureId }))
  const { data: feature } = useQuery(trpc.features.getFeature.queryOptions({ id: featureId }))
  const updateMutation = useMutation(trpc.features.updateFeatureJson.mutationOptions())

  const [editorValue, setEditorValue] = useState('')
  const [saveState, setSaveState] = useState<SaveIndicatorState>('saved')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showSpawnDialog, setShowSpawnDialog] = useState(false)

  const latestValueRef = useRef('')
  const validationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize editor from server data (only on first load)
  useEffect(() => {
    if (jsonData?.content && !editorValue) {
      setEditorValue(jsonData.content)
      latestValueRef.current = jsonData.content
    }
  }, [jsonData?.content, editorValue])

  // Cleanup pending validation debounce on unmount
  useEffect(() => {
    return () => {
      if (validationDebounceRef.current) clearTimeout(validationDebounceRef.current)
    }
  }, [])

  const validateContent = useCallback((value: string) => {
    try {
      const parsed = JSON.parse(value)
      const result = FeatureContentSchema.safeParse(parsed)
      if (result.success) {
        setValidationErrors([])
      } else {
        setValidationErrors(
          result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        )
      }
    } catch {
      setValidationErrors(['Invalid JSON: cannot parse'])
    }
  }, [])

  const handleEditorChange = useCallback(
    (value: string) => {
      setEditorValue(value)
      latestValueRef.current = value
      setSaveState('saving')
      if (validationDebounceRef.current) clearTimeout(validationDebounceRef.current)
      validationDebounceRef.current = setTimeout(() => { validateContent(value) }, 300)
    },
    [validateContent],
  )

  const handleSave = useCallback(
    (value: string) => {
      let formatted: string
      try {
        formatted = JSON.stringify(JSON.parse(value), null, 2)
      } catch {
        setSaveState('error')
        setValidationErrors(['Invalid JSON: cannot parse'])
        return
      }

      setEditorValue(formatted)
      latestValueRef.current = formatted
      setSaveState('saving')

      updateMutation.mutate(
        { id: featureId, jsonContent: formatted },
        {
          onSuccess: () => {
            setSaveState('saved')
            void queryClient.invalidateQueries({
              queryKey: trpc.features.getFeatureJson.queryOptions({ id: featureId }).queryKey,
            })
            void queryClient.invalidateQueries({
              queryKey: trpc.features.getFeature.queryOptions({ id: featureId }).queryKey,
            })
            void queryClient.invalidateQueries({ queryKey: [['features', 'listFeaturesPaginated']] })
            void queryClient.invalidateQueries({ queryKey: [['features', 'listRecent']] })
            void queryClient.invalidateQueries({ queryKey: [['features', 'listRootFeatures']] })
          },
          onError: (err) => {
            setSaveState('error')
            setValidationErrors([err.message])
          },
        },
      )
    },
    [featureId, queryClient, trpc, updateMutation],
  )

  const handleCopyJson = useCallback(() => {
    const content = (latestValueRef.current || jsonData?.content) ?? ''
    void navigator.clipboard.writeText(content)
      .then(() => { showToast({ type: 'success', message: 'JSON copied to clipboard' }) })
      .catch(() => { showToast({ type: 'error', message: 'Failed to copy to clipboard' }) })
  }, [jsonData?.content, showToast])

  const handleExportJson = useCallback(() => {
    const content = (latestValueRef.current || jsonData?.content) ?? ''
    const filename = `${jsonData?.featureKey ?? 'feature'}.json`
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.append(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [jsonData])

  // Cmd+S / Ctrl+S
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave(latestValueRef.current)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [handleSave])

  // Auto-save every 30s (only if dirty)
  useEffect(() => {
    const interval = setInterval(() => {
      if (saveState === 'saving') {
        handleSave(latestValueRef.current)
      }
    }, 30000)
    return () => { clearInterval(interval) }
  }, [saveState, handleSave])

  if (!jsonData) {
    return (
      <div className="animate-pulse p-6 flex flex-col gap-4">
        <div className="h-8 w-48 rounded bg-muted" />
      </div>
    )
  }

  const isFrozen = jsonData.frozen
  const contentMap = feature?.content as Record<string, Record<string, unknown>> | undefined
  const featureTitle = (contentMap?.problem?.problemStatement as string | undefined) ?? 'Untitled'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-muted-foreground">{jsonData.featureKey}</span>
          {isFrozen && (
            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Frozen — read only
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isFrozen && <SaveIndicator state={saveState} />}
          <Button type="button" variant="ghost" size="sm" onClick={handleCopyJson}>
            Copy JSON
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleExportJson}>
            Export JSON
          </Button>
          <Link
            href={`/features/${featureId}/wizard`}
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            Open in Wizard →
          </Link>
          {isFrozen && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => { setShowSpawnDialog(true) }}
            >
              Evolve this feature
            </Button>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <CodeMirror
          value={editorValue}
          extensions={[json()]}
          readOnly={isFrozen}
          onChange={handleEditorChange}
          height="100%"
          theme="dark"
          className="h-full text-sm"
        />
        {isFrozen && (
          <button
            type="button"
            className="absolute inset-0 cursor-not-allowed bg-transparent"
            aria-label="This feature is frozen. Click to evolve it."
            onClick={() => { setShowSpawnDialog(true) }}
          />
        )}
      </div>

      {/* Validation status bar */}
      <div
        role="status"
        aria-live="polite"
        className={`border-t border-border px-4 py-2 text-xs ${
          validationErrors.length === 0 ? 'text-green-500' : 'text-destructive'
        }`}
      >
        {validationErrors.length === 0
          ? '✓ Valid'
          : `✗ ${validationErrors.length} error${validationErrors.length > 1 ? 's' : ''}`}
        {validationErrors.length > 0 && (
          <ul className="mt-1 flex flex-col gap-0.5">
            {validationErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}
      </div>

      {showSpawnDialog && (
        <SpawnDialog
          parentId={featureId}
          parentFeatureKey={jsonData.featureKey}
          parentTitle={featureTitle}
          onClose={() => { setShowSpawnDialog(false) }}
        />
      )}
    </div>
  )
}
