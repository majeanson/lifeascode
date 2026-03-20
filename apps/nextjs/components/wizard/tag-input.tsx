"use client"

import { useState } from 'react'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useTRPC } from '@/trpc/react'

interface TagInputProps {
  featureId: string
  tags: string[]
}

export function TagInput({ featureId, tags }: TagInputProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [inputValue, setInputValue] = useState('')

  const updateTagsMutation = useMutation({
    ...trpc.features.updateTags.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: trpc.features.getFeature.queryKey({ id: featureId }),
      })
    },
  })

  const addTag = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed || tags.includes(trimmed) || tags.length >= 10) return
    updateTagsMutation.mutate({ featureId, tags: [...tags, trimmed] })
    setInputValue('')
  }

  const removeTag = (tag: string) => {
    updateTagsMutation.mutate({ featureId, tags: tags.filter((t) => t !== tag) })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    }
  }

  return (
    <div role="group" aria-label="Feature tags" className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-xs">
          {tag}
          <button
            type="button"
            aria-label={`Remove tag: ${tag}`}
            onClick={() => removeTag(tag)}
            className="ml-0.5 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </span>
      ))}
      {tags.length < 10 ? (
        <input
          type="text"
          aria-label="Add tag, press Enter or comma to confirm"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          placeholder="Add tag…"
        />
      ) : null}
      {tags.length >= 8 ? (
        <span className="text-xs text-muted-foreground">{tags.length}/10</span>
      ) : null}
    </div>
  )
}
