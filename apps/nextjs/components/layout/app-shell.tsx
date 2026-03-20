"use client"

import { useEffect } from 'react'

import { usePathname } from 'next/navigation'

import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useUIStore } from '@/stores/ui-store'

import { SearchOverlay } from '@/components/search/search-overlay'

import { Header } from './header'
import { NavigationProgress } from './navigation-progress'
import { Sidebar } from './sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed)

  // Hydrate persisted sidebar state client-side only (flash prevention)
  useEffect(() => {
    useUIStore.persist.rehydrate()
  }, [])

  // Global keyboard shortcuts: /, n, g d, g l
  useKeyboardShortcuts()

  // Focus main content heading after route changes
  const pathname = usePathname()
  useEffect(() => {
    document.querySelector<HTMLElement>('#main-content')?.focus()
  }, [pathname])

  return (
    <>
      <NavigationProgress />

      {/* Skip link — visually hidden until focused */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <header
        aria-label="App header"
        className="fixed left-0 right-0 top-0 z-40 h-12 border-b bg-background"
      >
        <Header />
      </header>

      <aside
        aria-label="Main navigation"
        className={`fixed bottom-0 top-12 hidden transition-all duration-200 ease-in-out md:flex md:flex-col ${
          sidebarCollapsed ? 'w-12' : 'md:w-12 lg:w-60'
        } border-r bg-background`}
      >
        <Sidebar />
      </aside>

      <main
        id="main-content"
        tabIndex={-1}
        className={`mt-12 min-h-[calc(100dvh-3rem)] flex-1 transition-all duration-200 ease-in-out focus:outline-none ${
          sidebarCollapsed ? 'md:ml-12' : 'md:ml-12 lg:ml-60'
        }`}
      >
        {children}
      </main>

      <SearchOverlay />
    </>
  )
}
