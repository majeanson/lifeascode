"use client"

import { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'

import type { Feature } from '@life-as-code/db'

import { useTRPC } from '@/trpc/react'

import { FeatureStateBadge } from './feature-state-badge'

interface GuideViewProps {
  featureId: string
}

function getTitle(feature: Feature): string {
  const contentMap = feature.content as Record<string, Record<string, unknown>> | undefined
  return (contentMap?.problem?.problemStatement as string | undefined) ?? feature.featureKey
}

function RelatedFeatureCard({ feature }: { feature: Feature }) {
  const title = getTitle(feature)
  const contentMap = feature.content as Record<string, Record<string, unknown>> | undefined
  const problem = (contentMap?.problem?.problemStatement as string | undefined) ?? ''
  return (
    <Link
      href={`/features/${feature.id}`}
      className="flex flex-col gap-1 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{feature.featureKey}</span>
        <FeatureStateBadge status={feature.status} frozen={feature.frozen} variant="compact" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {problem && <p className="text-xs text-muted-foreground line-clamp-2">{problem}</p>}
    </Link>
  )
}

/**
 * GuideView — help-file style summary of a feature.
 * Shows problem statement, analysis, implementation notes, and known limitations
 * in plain language with clear section headers.
 */
export function GuideView({ featureId }: GuideViewProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { data: feature } = useQuery(trpc.features.getFeature.queryOptions({ id: featureId }))
  const { data: lineage } = useQuery(trpc.features.getLineage.queryOptions({ id: featureId }))

  const [feedbackSent, setFeedbackSent] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null)

  const addAnnotation = useMutation(trpc.features.addAnnotation.mutationOptions())

  if (!feature) {
    return (
      <div className="animate-pulse p-6 flex flex-col gap-4">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="h-8 w-96 rounded bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
      </div>
    )
  }

  const contentMap = feature.content as Record<string, Record<string, unknown>> | undefined

  const problemStatement =
    (contentMap?.problem?.problemStatement as string | undefined) ?? ''
  const reporterContext =
    (contentMap?.problem?.reporterContext as string | undefined) ?? ''

  const analysisStage = contentMap?.analysis as Record<string, unknown> | undefined
  const analysisText = analysisStage
    ? Object.values(analysisStage)
        .filter((v) => typeof v === 'string' && v.trim().length > 0)
        .join('\n\n')
    : ''

  const implementationStage = contentMap?.implementation as Record<string, unknown> | undefined
  const implementationText = implementationStage
    ? Object.values(implementationStage)
        .filter((v) => typeof v === 'string' && v.trim().length > 0)
        .join('\n\n')
    : ''

  const rawLimitations = contentMap?.knownLimitations
  const knownLimitations = Array.isArray(rawLimitations)
    ? rawLimitations.filter((v): v is string => typeof v === 'string')
    : []

  const rawTags = contentMap?.tags
  const tags = Array.isArray(rawTags)
    ? rawTags.filter((t): t is string => typeof t === 'string')
    : []

  return (
    <article className="flex flex-col gap-8 p-6 max-w-3xl">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs text-muted-foreground">{feature.featureKey}</p>
        <h1 className="text-2xl font-bold leading-snug text-foreground">
          {problemStatement || 'Untitled Feature'}
        </h1>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Problem */}
      <section id="problem">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Problem Statement
        </h2>
        <p className="text-base text-foreground leading-relaxed">
          {problemStatement || <em className="text-muted-foreground">No problem statement recorded.</em>}
        </p>
        {reporterContext && (
          <p className="mt-2 text-sm text-muted-foreground italic">
            Context: {reporterContext}
          </p>
        )}
      </section>

      {/* Analysis */}
      {analysisText && (
        <section id="analysis">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Analysis
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {analysisText.split('\n\n').map((para, i) => (
              <p key={i} className="text-base text-foreground leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Implementation Notes */}
      {implementationText && (
        <section id="implementation">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Implementation Notes
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {implementationText.split('\n\n').map((para, i) => (
              <p key={i} className="text-base text-foreground leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Known Limitations */}
      {knownLimitations.length > 0 && (
        <section id="limitations">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Known Limitations
          </h2>
          <ul className="flex flex-col gap-1.5 list-disc list-inside">
            {knownLimitations.map((limit, i) => (
              <li key={i} className="text-sm text-foreground">
                {limit}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!analysisText && !implementationText && knownLimitations.length === 0 && (
        <p className="text-sm text-muted-foreground">
          This feature has not been fully documented yet. Use the wizard to add analysis,
          implementation notes, and known limitations.
        </p>
      )}

      {/* Related Features */}
      {lineage && (lineage.parent ?? lineage.children.length > 0) && (
        <section id="related">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Related Features
          </h2>
          <div className="flex flex-col gap-2">
            {lineage.parent && (
              <>
                <p className="text-xs text-muted-foreground">Parent</p>
                <RelatedFeatureCard feature={lineage.parent as Feature} />
              </>
            )}
            {lineage.children.length > 0 && (
              <>
                <p className="mt-2 text-xs text-muted-foreground">Children</p>
                {lineage.children.map((child) => (
                  <RelatedFeatureCard key={child.id} feature={child as Feature} />
                ))}
              </>
            )}
          </div>
        </section>
      )}

      {/* Feedback widget */}
      <section className="border-t border-border pt-6">
        {feedbackSent ? (
          <p className="text-sm text-muted-foreground">Thanks for the feedback!</p>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">Was this helpful?</p>
            {(['👍', '👏', '👎'] as const).map((emoji) => {
              const feedbackMap = { '👍': 'helpful', '👏': 'very helpful', '👎': 'not helpful' } as const
              const label = feedbackMap[emoji]
              return (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`Mark as ${label}`}
                  aria-pressed={selectedFeedback === label}
                  disabled={selectedFeedback !== null}
                  onClick={() => {
                    setSelectedFeedback(label)
                    addAnnotation.mutate(
                      { featureId, text: `User feedback: ${label}` },
                      {
                        onSuccess: () => {
                          void queryClient.invalidateQueries({
                            queryKey: trpc.features.listAnnotations.queryOptions({ id: featureId }).queryKey,
                          })
                          setFeedbackSent(true)
                        },
                      },
                    )
                  }}
                  className={`rounded-md px-3 py-1.5 text-base transition-colors hover:scale-110 ${
                    selectedFeedback === label
                      ? 'ring-2 ring-primary'
                      : 'bg-muted hover:bg-muted/70'
                  }`}
                >
                  {emoji}
                </button>
              )
            })}
          </div>
        )}
      </section>
    </article>
  )
}
