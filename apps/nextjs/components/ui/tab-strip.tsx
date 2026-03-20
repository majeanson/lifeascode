"use client"

import type { MutableRefObject } from 'react'

export interface TabDef<T extends string> {
  key: T
  label: string
}

interface TabStripProps<T extends string> {
  tabs: readonly TabDef<T>[]
  active: T
  onSwitch: (tab: T) => void
  /**
   * Optional ref array so callers can drive arrow-key focus between tab buttons.
   * Pass a `useRef<(HTMLButtonElement | null)[]>([])` and call `.current[n]?.focus()`.
   */
  tabRefs?: MutableRefObject<(HTMLButtonElement | null)[]>
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => void
  ariaLabel?: string
}

/**
 * Reusable accessible tab strip.
 *
 * Renders role="tablist" with aria-selected, focus-ring styling, and a bottom-border
 * active indicator — the same pattern used throughout the app.
 *
 * Consumers: FeatureDetailView (Overview/Edit/Guide/… tabs), AdminShell (Schema/Templates/Export).
 * Future consumers: any multi-panel surface.
 */
export function TabStrip<T extends string>({
  tabs,
  active,
  onSwitch,
  tabRefs,
  onKeyDown,
  ariaLabel = 'Tabs',
}: TabStripProps<T>) {
  return (
    <div className="border-b border-border">
      <ul role="tablist" aria-label={ariaLabel} className="flex gap-1 overflow-x-auto">
        {tabs.map((tab, index) => {
          const isActive = active === tab.key
          return (
            <li key={tab.key}>
              <button
                ref={tabRefs ? (el) => { tabRefs.current[index] = el } : undefined}
                type="button"
                role="tab"
                id={`tab-${tab.key}`}
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.key}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onSwitch(tab.key)}
                onKeyDown={onKeyDown ? (e) => onKeyDown(e, index) : undefined}
                className={`whitespace-nowrap rounded-t-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  isActive
                    ? 'border-b-2 border-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
