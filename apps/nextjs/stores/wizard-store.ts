"use client"

import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'

import type { SaveIndicatorState } from '@life-as-code/ui'
import type { LifecycleStage } from '@life-as-code/validators'

export type CompletionLevel = 'quick' | 'standard' | 'deep'

export interface WizardState {
  // Persisted
  lastEditedStage: Record<string, LifecycleStage>
  currentMode: 'focus' | 'fast'
  completionLevel: CompletionLevel
  // Ephemeral (not persisted)
  saveState: SaveIndicatorState
  // Actions
  setLastEditedStage: (featureId: string, stage: LifecycleStage) => void
  setCurrentMode: (mode: 'focus' | 'fast') => void
  setCompletionLevel: (level: CompletionLevel) => void
  setSaveState: (state: SaveIndicatorState) => void
  getLastEditedStage: (featureId: string) => LifecycleStage
}

export const useWizardStore = create<WizardState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        lastEditedStage: {},
        currentMode: 'focus',
        completionLevel: 'quick',
        saveState: 'saved',
        setLastEditedStage: (featureId, stage) =>
          set((state) => ({
            lastEditedStage: { ...state.lastEditedStage, [featureId]: stage },
          })),
        setCurrentMode: (mode) => set({ currentMode: mode }),
        setCompletionLevel: (level) => set({ completionLevel: level }),
        setSaveState: (saveState) => set({ saveState }),
        getLastEditedStage: (featureId) =>
          get().lastEditedStage[featureId] ?? 'problem',
      })),
      {
        name: 'lac-wizard-store',
        skipHydration: true,
        partialize: (state) => ({
          lastEditedStage: state.lastEditedStage,
          currentMode: state.currentMode,
          completionLevel: state.completionLevel,
        }),
      },
    ),
    { name: 'WizardStore' },
  ),
)
