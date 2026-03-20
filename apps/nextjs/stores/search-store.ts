"use client"

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface SearchState {
  isOpen: boolean
  triggerEl: HTMLElement | null
  open: (trigger?: HTMLElement | null) => void
  close: () => void
}

export const useSearchStore = create<SearchState>()(
  devtools(
    (set, get) => ({
      isOpen: false,
      triggerEl: null,
      open: (trigger) => set({ isOpen: true, triggerEl: trigger ?? null }),
      close: () => {
        const { triggerEl } = get()
        triggerEl?.focus()
        set({ isOpen: false, triggerEl: null })
      },
    }),
    { name: 'SearchStore' },
  ),
)
