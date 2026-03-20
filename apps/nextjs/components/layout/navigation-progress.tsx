'use client'

import { useUIStore } from '@/stores/ui-store'

export function NavigationProgress() {
  const navPending = useUIStore((state) => state.navPending)

  if (!navPending) return null

  return (
    <div
      aria-hidden="true"
      className="fixed left-0 top-0 z-50 h-[2px] w-full overflow-hidden"
    >
      <div className="animate-progress-bar h-full bg-primary" />
    </div>
  )
}
