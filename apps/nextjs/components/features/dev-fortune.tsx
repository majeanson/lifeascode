'use client'

const FORTUNES = [
  "The best feature is the one you didn't ship.",
  "Your MVP is someone else's tech debt.",
  "Every estimate is fiction. Today's is especially creative.",
  "The feature you shipped last sprint is already legacy code.",
  "Tech debt is just a mortgage on your future self's weekend.",
  "If it's not in a feature.json, did it even happen?",
  "The next sprint will be calmer. It always will be.",
  "Scope creep is just enthusiasm with bad timing.",
  "Every 'quick fix' was once a 'quick feature'.",
  "Your backlog is not a graveyard. It's a museum of good intentions.",
  "The documentation will be written. Just not today.",
  "Production is just staging with consequences.",
  "The edge cases are not bugs. They're surprise features.",
  "Ship it and see. Users will find what tests cannot.",
  "There are no deleted features. Only deferred ones.",
  "A/B testing is just committing to a decision, slowly.",
  "The deadline was always today. You just didn't know it yet.",
  "Refactoring is writing it again with more confidence.",
  "Every frozen feature was once someone's dream.",
  "The feature you're delaying is already being built by a competitor.",
  "Done is a myth. There is only 'merged' and 'not yet merged'.",
  "The ticket said 'small change'. It was not a small change.",
  "You don't have tech debt. You have a vintage codebase.",
  "The simplest solution is the one written after the deadline.",
  "Every senior dev was once confident about their first architecture.",
  "'It works on my machine' is just undocumented cloud infrastructure.",
  "The feature was always 80% done. It remains 80% done.",
  "Naming things is hard. The second hardest thing is everything else.",
  "The bug you fixed today was the feature someone shipped last year.",
  "Version 2.0 will be cleaner. Version 2.0 will not be built.",
]

export function DevFortune() {
  const now = new Date()
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000,
  )
  const fortune = FORTUNES[dayOfYear % FORTUNES.length]!

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3">
      <p className="text-xs text-muted-foreground">
        <span className="mr-2 font-mono text-primary/70">✦ fortune</span>
        <span className="italic">{fortune}</span>
      </p>
    </div>
  )
}
