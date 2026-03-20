"use client"

import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'

export interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  navPending: boolean
  setNavPending: (pending: boolean) => void
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      subscribeWithSelector((set) => ({
        sidebarCollapsed: false,
        toggleSidebar: () =>
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        navPending: false,
        setNavPending: (pending) => set({ navPending: pending }),
      })),
      {
        name: 'lac-ui-store',
        skipHydration: true,
      },
    ),
    { name: 'UIStore' },
  ),
)
