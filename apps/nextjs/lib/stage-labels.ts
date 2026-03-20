import type { LifecycleStage } from '@life-as-code/validators'

/**
 * Human-readable label for each lifecycle stage.
 * Single source of truth — import this wherever a stage name is displayed.
 * Previously duplicated in wizard-shell.tsx and feature-detail-view.tsx.
 */
export const STAGE_LABEL: Record<LifecycleStage, string> = {
  problem: 'Problem',
  analysis: 'Analysis',
  requirements: 'Requirements',
  design: 'Design',
  implementation: 'Implementation',
  validation: 'Validation',
  documentation: 'Documentation',
  delivery: 'Delivery',
  support: 'Support',
}
