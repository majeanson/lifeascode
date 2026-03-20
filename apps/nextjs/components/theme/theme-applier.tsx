"use client"

import { useEffect } from 'react'

import { useTheme } from '@life-as-code/ui'

import { useThemeStore } from '@/stores/theme-store'

export function ThemeApplier() {
  const visualCharacter = useThemeStore((state) => state.visualCharacter)
  const brightness = useThemeStore((state) => state.brightness)
  const { setTheme } = useTheme()

  // Hydrate persisted theme state client-side only (flash prevention)
  useEffect(() => {
    useThemeStore.persist.rehydrate()
  }, [])

  // Sync brightness with next-themes
  useEffect(() => {
    setTheme(brightness)
  }, [brightness, setTheme])

  // Apply visual character class to <html>
  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('code-mode', 'human-mode')
    html.classList.add(`${visualCharacter}-mode`)
  }, [visualCharacter])

  return null
}
