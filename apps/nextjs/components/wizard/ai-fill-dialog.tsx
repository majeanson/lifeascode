"use client"

import { useEffect, useRef, useState } from 'react'

import { Button } from '@life-as-code/ui'
import type { FeatureContent } from '@life-as-code/validators'

interface AiFillDialogProps {
  onClose: () => void
  onApply: (content: FeatureContent) => void
}

export function AiFillDialog({ onClose, onApply }: AiFillDialogProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown) }
  }, [onClose])

  async function handleGenerate() {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/fill-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })
      const data = (await res.json()) as { content?: FeatureContent; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Generation failed — please try again')
        return
      }
      if (!data.content) {
        setError('No content returned — please try again')
        return
      }
      onApply(data.content)
      onClose()
    } catch {
      setError('Network error — please check your connection and try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Fill feature with AI"
    >
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">✨ Fill with AI</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe your feature in plain language. Claude will generate a complete draft across all stages.
          </p>
        </div>

        {/* Prompt input */}
        <div className="px-6 py-4">
          <label htmlFor="ai-prompt" className="mb-2 block text-sm font-medium text-foreground">
            Feature description
          </label>
          <textarea
            id="ai-prompt"
            ref={textareaRef}
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleGenerate()
            }}
            placeholder="e.g. Mobile users can't filter search results by date. We need a slide-in filter drawer that persists across page navigation and works without JavaScript..."
            rows={5}
            disabled={loading}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            aria-required="true"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Tip: ⌘+Enter to generate
          </p>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          {loading && (
            <p className="mt-2 text-xs text-muted-foreground">
              Generating… this may take a few seconds
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={() => { void handleGenerate() }}
            disabled={!prompt.trim() || loading}
          >
            {loading ? 'Generating…' : '✨ Generate'}
          </Button>
        </div>
      </div>
    </div>
  )
}
