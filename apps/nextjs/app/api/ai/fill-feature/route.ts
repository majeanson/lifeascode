import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are a product and engineering analyst helping to document a software feature.

Given a description of a feature, generate a complete, realistic feature document as JSON.

Return ONLY a valid JSON object with this exact structure (no markdown fences, no text outside the JSON):

{
  "title": "concise feature title (max 80 chars)",
  "tags": ["tag1", "tag2", "tag3"],
  "problem": {
    "problemStatement": "what human problem or friction triggered this feature",
    "reporterContext": "who reported it and what additional context they provided",
    "impactedUsers": "which users are affected and how often",
    "successMetric": "how we know the problem is solved — specific and measurable",
    "priorityRationale": "why solve this now rather than later"
  },
  "analysis": {
    "analysisNotes": "what was investigated and what was found",
    "dataPoints": "data or evidence backing the need (numbers, quotes, ticket counts)",
    "riskFactors": "risks of implementing this solution",
    "competitorAnalysis": "how others handle this problem, or empty string if not applicable"
  },
  "requirements": {
    "requirementsList": "discrete behaviours the feature must have, listed clearly",
    "outOfScope": "what this feature should explicitly NOT do",
    "constraints": "technical, time, or regulatory constraints shaping the solution",
    "edgeCases": "edge cases, empty states, and error conditions to handle"
  },
  "design": {
    "designNotes": "how the feature should work and feel — interaction and visual approach",
    "uxConsiderations": "UX patterns, interactions, loading/error/empty states",
    "alternatives": "alternative designs considered and why this approach won",
    "accessibilityNotes": "accessibility requirements: focus management, ARIA, keyboard nav"
  },
  "implementation": {
    "implementationNotes": "high-level technical approach — which files change, how data flows",
    "technicalStack": "libraries or patterns to use and why (skip obvious/boilerplate choices)",
    "dependencies": "code, service, or team dependencies and blockers",
    "performanceNotes": "performance targets, render budget, caching, or bundle concerns"
  },
  "validation": {
    "validationNotes": "how the feature will be tested before shipping",
    "testCases": "key scenarios that must pass: happy paths, edge cases, failure states",
    "testEnvironment": "seed data, feature flags, or staging config needed to test",
    "loadTestingNotes": "load/performance testing requirements, or empty string if N/A"
  },
  "documentation": {
    "documentationNotes": "what documentation this feature needs",
    "audience": "who will read the docs (end users, internal engineers, both)",
    "docFormat": "where docs will live and in what format (Notion, GitHub wiki, CMS, etc.)",
    "translationNotes": "i18n/translation considerations, or empty string if N/A"
  },
  "delivery": {
    "deliveryPlan": "who deploys it, when, to which environments, and sign-off criteria",
    "rolloutStrategy": "gradual rollout (flags, percentages, beta groups) or all-at-once",
    "rollbackPlan": "how to roll back if something breaks after shipping",
    "monitoringPlan": "what metrics, dashboards, or alerts to watch post-launch"
  },
  "support": {
    "supportNotes": "what support agents should know — gotchas, common questions",
    "knownIssues": "known limitations or issues to communicate at launch",
    "escalationPath": "who owns this and how to escalate (Slack channel, on-call, Jira)",
    "slaDefinitions": "SLA or response-time commitments, or empty string if N/A"
  }
}

Rules:
- Fill every field with realistic, practical content based on the description
- 2-4 lowercase tags reflecting the domain (e.g. "auth", "mobile", "payments", "search")
- For fields where context is truly insufficient, write a reasonable inference rather than leaving blank
- Keep text direct and actionable — this is a working document, not marketing copy
- Never wrap the JSON in markdown code fences`

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured on the server' },
      { status: 500 },
    )
  }

  let prompt: string
  try {
    const body = (await req.json()) as { prompt?: unknown }
    if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }
    prompt = body.prompt.trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Feature description:\n\n${prompt}` }],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''

  try {
    const content = JSON.parse(text) as unknown
    return NextResponse.json({ content })
  } catch {
    return NextResponse.json(
      { error: 'AI returned invalid JSON — please try again', raw: text.slice(0, 500) },
      { status: 500 },
    )
  }
}
