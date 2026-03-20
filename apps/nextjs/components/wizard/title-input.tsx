"use client"

import { useEffect, useRef, useState } from 'react'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useTRPC } from '@/trpc/react'

interface TitleInputProps {
  featureId: string
  value: string
}

export function TitleInput({ featureId, value }: TitleInputProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [localValue, setLocalValue] = useState(value)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync when the prop changes (e.g. after another client saves)
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const updateTitleMutation = useMutation({
    ...trpc.features.updateTitle.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: trpc.features.getFeature.queryKey({ id: featureId }),
      })
      void queryClient.invalidateQueries({ queryKey: [['features', 'listFeaturesPaginated']] })
      void queryClient.invalidateQueries({ queryKey: [['features', 'listRecent']] })
      void queryClient.invalidateQueries({ queryKey: [['features', 'listRootFeatures']] })
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setLocalValue(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateTitleMutation.mutate({ featureId, title: v })
    }, 500)
  }

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  return (
    <input
      type="text"
      aria-label="Feature title"
      value={localValue}
      onChange={handleChange}
      maxLength={200}
      placeholder="Feature title…"
      className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
    />
  )
}
