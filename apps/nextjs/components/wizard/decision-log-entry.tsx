"use client"

import type { DecisionEntry } from '@life-as-code/validators'

interface DecisionLogEntryProps {
  entry: DecisionEntry
}

export function DecisionLogEntry({ entry }: DecisionLogEntryProps) {
  return (
    <article className="border-l-2 border-primary pl-3">
      <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Decision</p>
      <p className="text-sm">{entry.what}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="font-medium">Why:</span> {entry.why}
      </p>
      {entry.alternatives ? (
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-medium">Alternatives:</span> {entry.alternatives}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">
        {entry.actor} &middot;{' '}
        <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleDateString()}</time>
      </p>
    </article>
  )
}
