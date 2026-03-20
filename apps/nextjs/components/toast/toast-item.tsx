"use client"

import { useEffect, type KeyboardEvent } from 'react'

import { cn } from '@life-as-code/ui'

import type { Toast } from '@/stores/toast-store'
import { useToastStore } from '@/stores/toast-store'

const borderColorMap = {
  success: 'border-emerald-400',
  error: 'border-red-400',
  warning: 'border-amber-400',
  info: 'border-accent',
} as const

interface ToastItemProps {
  toast: Toast
}

export function ToastItem({ toast }: ToastItemProps) {
  const dismissToast = useToastStore((state) => state.dismissToast)

  useEffect(() => {
    const delay = Math.max(0, toast.dismissAt - Date.now())
    const timer = setTimeout(() => {
      dismissToast(toast.id)
    }, delay)
    return () => {
      clearTimeout(timer)
    }
  }, [toast.id, toast.dismissAt, dismissToast])

  return (
    <div
      role="status"
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-md border-l-4 bg-card px-4 py-3 text-sm shadow-md',
        borderColorMap[toast.type],
      )}
      onClick={() => dismissToast(toast.id)}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') dismissToast(toast.id)
      }}
    >
      <span>{toast.message}</span>
    </div>
  )
}
