"use client"

import { useRef, useState } from 'react'

import { Menu } from 'lucide-react'

import { useSearchStore } from '@/stores/search-store'

import { MobileNav } from './mobile-nav'

const SHORTCUTS = [
  { keys: '/', description: 'Search features' },
  { keys: '⌘K', description: 'Search features' },
  { keys: 'n', description: 'New feature' },
  { keys: 'g d', description: 'Go to dashboard (home)' },
  { keys: 'g l', description: 'Go to feature list' },
]

function KeyboardShortcutsTooltip() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o) }}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts"
      >
        ?
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setOpen(false) }}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-9 z-50 w-56 rounded-lg border border-border bg-background p-3 shadow-lg">
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Keyboard shortcuts
            </p>
            <ul className="flex flex-col gap-1.5">
              {SHORTCUTS.map(({ keys, description }) => (
                <li key={keys} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{description}</span>
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {keys}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

export function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const searchButtonRef = useRef<HTMLButtonElement>(null)
  const openSearch = useSearchStore((s) => s.open)

  return (
    <div className="flex h-full items-center gap-2 px-4">
      <button
        type="button"
        className="mr-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        aria-label="Open navigation"
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="font-semibold">life-as-code</span>

      <div className="ml-auto flex items-center gap-2">
        <button
          ref={searchButtonRef}
          type="button"
          className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Search features (Cmd+K)"
          onClick={() => openSearch(searchButtonRef.current)}
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden rounded border border-border px-1 py-0.5 text-xs sm:inline">⌘K</kbd>
        </button>
        <KeyboardShortcutsTooltip />
      </div>

      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </div>
  )
}
