"use client"

import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'

export type Brightness = 'dark' | 'light'
export type VisualCharacter = 'code' | 'human'
export type AccentTheme = 'rose' | 'indigo' | 'emerald' | 'amber' | 'cyan' | 'slate'

export interface ThemeState {
  brightness: Brightness
  visualCharacter: VisualCharacter
  accentTheme: AccentTheme
  setBrightness: (b: Brightness) => void
  setVisualCharacter: (v: VisualCharacter) => void
  setAccentTheme: (a: AccentTheme) => void
}

export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      subscribeWithSelector((set) => ({
        brightness: 'dark',
        visualCharacter: 'human',
        accentTheme: 'rose',
        setBrightness: (brightness) => set({ brightness }),
        setVisualCharacter: (visualCharacter) => set({ visualCharacter }),
        setAccentTheme: (accentTheme) => set({ accentTheme }),
      })),
      {
        name: 'lac-theme-store',
        skipHydration: true,
      },
    ),
    { name: 'ThemeStore' },
  ),
)
