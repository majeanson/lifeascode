"use client"

import type { Route } from 'next'

import { useRouter, usePathname } from 'next/navigation'

import { BookOpen, CalendarRange, GitBranch, LayoutDashboard, List, PanelLeftClose, PanelLeftOpen, Settings, Trees } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'

import { useUIStore } from '@/stores/ui-store'

/**
 * Primary navigation links.
 * "New Feature" is removed — it's an action, available as a button on the dashboard.
 * "Search" is removed — it's in the header (⌘K) on every page.
 * `exact` prevents the root "/" from matching all routes.
 */
const navLinks: { icon: LucideIcon; label: string; href: Route; ariaLabel: string; exact?: boolean }[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/',        ariaLabel: 'Dashboard',      exact: true },
  { icon: List,            label: 'Features',  href: '/features', ariaLabel: 'Feature list' },
  { icon: Trees,           label: 'Tree',       href: '/tree',     ariaLabel: 'Feature Tree' },
  { icon: CalendarRange,   label: 'Timeline',   href: '/timeline', ariaLabel: 'Timeline view' },
  { icon: BookOpen,        label: 'Docs',          href: '/docs',          ariaLabel: 'Documentation' },
  { icon: GitBranch,       label: 'Integrations',  href: '/integrations',  ariaLabel: 'Integrations' },
  { icon: Settings,        label: 'Admin',          href: '/admin',         ariaLabel: 'Admin' },
]

export function Sidebar() {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  const setNavPending = useUIStore((state) => state.setNavPending)
  const pathname = usePathname()
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  // Clear pending once the real pathname catches up
  useEffect(() => {
    setPendingHref(null)
    setNavPending(false)
  }, [pathname, setNavPending])

  const handleNav = (href: string) => {
    setPendingHref(href)
    setNavPending(true)
    startTransition(() => {
      router.push(href as Parameters<typeof router.push>[0])
    })
  }

  return (
    <nav aria-label="Primary navigation" className="flex h-full flex-col justify-between py-2">
      <ul className="flex flex-col gap-1 px-1">
        {navLinks.map(({ icon: Icon, label, href, ariaLabel, exact }) => {
          // Use pending href for instant feedback; fall back to real pathname
          const isActive = pendingHref
            ? pendingHref === href
            : exact ? pathname === href : pathname.startsWith(href)
          return (
            <li key={href}>
              <button
                type="button"
                aria-label={ariaLabel}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleNav(href)}
                className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  isActive
                    ? 'border-l-2 border-primary bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && (
                  <span className="hidden lg:block">{label}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="px-1 pb-2">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
          className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-5 w-5 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5 shrink-0" />
              <span className="hidden lg:block">Collapse</span>
            </>
          )}
        </button>
      </div>
    </nav>
  )
}
