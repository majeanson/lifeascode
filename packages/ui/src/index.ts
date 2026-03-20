import type { ClassValue } from 'clsx'

import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export * from 'class-variance-authority'
export * from 'next-themes'
export { Button, buttonVariants } from './components/button'
export { SaveIndicator } from './components/save-indicator'
export type { SaveIndicatorState } from './components/save-indicator'
