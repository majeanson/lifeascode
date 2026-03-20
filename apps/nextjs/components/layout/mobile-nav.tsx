"use client"

import { useEffect, useRef } from 'react'

import type { Route } from 'next'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Search, Settings, Trees, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const navLinks: { icon: LucideIcon; label: string; href: Route; ariaLabel: string }[] = [
  { icon: Trees, label: 'Feature Tree', href: '/features', ariaLabel: 'Feature Tree' },
  { icon: Search, label: 'Search', href: '/search', ariaLabel: 'Search' },
  { icon: Settings, label: 'Admin', href: '/admin', ariaLabel: 'Admin' },
]

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Close on route change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onClose() }, [pathname])

  // Close on Escape key + implement focus trap
  useEffect(() => {
    if (!open) return

    const dialog = dialogRef.current
    if (!dialog) return

    // Auto-focus first focusable element when opened
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    focusable[0]?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const focusableNow = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      const first = focusableNow[0]
      const last = focusableNow.at(-1)

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else if (document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex flex-col bg-background md:hidden"
      role="dialog"
      aria-modal
      aria-label="Mobile navigation"
    >
      <div className="flex h-12 items-center justify-between border-b px-4">
        <span className="font-semibold">life-as-code</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 px-4 py-4">
        <ul className="flex flex-col gap-1">
          {navLinks.map(({ icon: Icon, label, href, ariaLabel }) => {
            const isActive = pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-label={ariaLabel}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-md px-3 py-3 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    isActive
                      ? 'border-l-2 border-primary bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
