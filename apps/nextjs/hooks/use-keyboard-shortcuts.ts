"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useSearchStore } from '@/stores/search-store'

/**
 * Registers global keyboard shortcuts for the app shell.
 *
 * Shortcuts (only active when no input/textarea/select is focused):
 *   /   → focus the search overlay
 *   n   → navigate to /features/new
 *   ?   → toggle the keyboard shortcuts help modal
 *   g d → go to /dashboard
 *   g l → go to /features
 */
export function useKeyboardShortcuts() {
  const router = useRouter()
  const openSearch = useSearchStore((s) => s.open)

  useEffect(() => {
    let gPressed = false
    let gTimer: ReturnType<typeof setTimeout> | null = null

    function isInputActive(): boolean {
      const el = document.activeElement
      if (!el) return false
      const tag = el.tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
      // Walk up the DOM — isContentEditable is only true on the root
      // contenteditable element, not on its children.
      let node: Element | null = el
      while (node && node !== document.body) {
        if ((node as HTMLElement).contentEditable === 'true') return true
        node = node.parentElement
      }
      return false
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Skip when meta/ctrl/alt is held (let browser shortcuts pass through)
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // Skip when an input is focused
      if (isInputActive()) return

      if (gPressed) {
        // Second key in a "g <key>" sequence
        if (gTimer) clearTimeout(gTimer)
        gPressed = false

        if (e.key === 'd') {
          e.preventDefault()
          router.push('/')
        } else if (e.key === 'l') {
          e.preventDefault()
          router.push('/features')
        }
        return
      }

      switch (e.key) {
        case '/':
          e.preventDefault()
          openSearch()
          break

        case 'n':
          e.preventDefault()
          router.push('/features/new')
          break

        case 'g':
          // Start a "g <key>" sequence; reset after 800ms if no follow-up
          gPressed = true
          gTimer = setTimeout(() => { gPressed = false }, 800)
          break

        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (gTimer) clearTimeout(gTimer)
    }
  }, [router, openSearch])
}
