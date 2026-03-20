import { and, desc, eq, featureEvents, featureTemplates, features, inArray, like, schemaConfigs, sql } from '@life-as-code/db'
import {
  CloneTemplateSchema,
  CreateTemplateSchema,
  DEFAULT_SCHEMA_CONFIG,
  DeleteTemplateSchema,
  EventType,
  ExportAllSchema,
  GetActiveSchemaSchema,
  ListTemplatesSchema,
  SchemaConfigContentSchema,
  UpdateSchemaSchema,
  UpdateTemplateSchema,
} from '@life-as-code/validators'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createTRPCRouter, publicProcedure } from '@/trpc'

// ---------------------------------------------------------------------------
// Seed data helpers
// ---------------------------------------------------------------------------

const DOMAINS = ['User', 'Admin', 'API', 'Dashboard', 'Analytics', 'Search', 'Auth', 'Notifications', 'Export', 'Settings', 'Billing', 'Integrations', 'Reports', 'Onboarding', 'Mobile']
const ACTIONS = ['optimize', 'refactor', 'implement', 'redesign', 'migrate', 'streamline', 'enhance', 'automate', 'consolidate', 'deprecate', 'monitor', 'audit', 'cache', 'paginate', 'validate']
const NOUNS = ['flow', 'panel', 'pipeline', 'service', 'module', 'endpoint', 'widget', 'hook', 'queue', 'index', 'schema', 'trigger', 'cache', 'token', 'manifest']
const TAGS_POOL = ['performance', 'security', 'ux', 'api', 'database', 'mobile', 'accessibility', 'i18n', 'devex', 'monitoring', 'testing', 'documentation', 'compliance', 'scale']
const ACTORS = ['alice', 'bob', 'carol', 'dave', 'eve', 'frank', 'grace', 'heidi']
const TARGET_PERIODS = ['2025-Q2', '2025-Q3', '2025-Q4', '2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4']

function pick<T>(arr: T[], i: number): T { return arr[i % arr.length]! }

function seedTitle(i: number) {
  return `${pick(DOMAINS, i)}: ${pick(ACTIONS, Math.floor(i / DOMAINS.length))} ${pick(NOUNS, Math.floor(i / (DOMAINS.length * ACTIONS.length)))} #${i + 1}`
}

function seedContent(i: number, completedStages: number) {
  const t = seedTitle(i)
  const actor = pick(ACTORS, i)

  const decision = (stage: string, n: number) => ({
    id: crypto.randomUUID(),
    what: `Decision ${n} for ${stage} in ${t}`,
    why: `Required for correctness and maintainability of the ${pick(DOMAINS, i + n)} system`,
    alternatives: n % 2 === 0 ? `Alternative approach: use a different ${pick(NOUNS, i + n)} pattern` : undefined,
    createdAt: new Date(Date.now() - (10000 - i) * 3600_000).toISOString(),
    actor,
  })

  const stages: Record<string, Record<string, unknown>> = {}

  if (completedStages >= 1) stages.problem = {
    problemStatement: `${t} — users experience friction because the current ${pick(NOUNS, i)} does not handle edge cases gracefully.`,
    reporterContext: `Reported by ${actor} during sprint ${(i % 20) + 1} planning.`,
    impactedUsers: `All users accessing the ${pick(DOMAINS, i)} module (approx ${(i % 50 + 1) * 200} MAU).`,
    successMetric: `Reduce ${pick(ACTIONS, i)} latency by 30% and error rate below 0.5%.`,
    priorityRationale: `Blocks Q${(i % 4) + 1} OKR: improve ${pick(DOMAINS, i)} reliability.`,
    decisions: i % 3 === 0 ? [decision('problem', 1), decision('problem', 2)] : [],
  }

  if (completedStages >= 2) stages.analysis = {
    analysisNotes: `Root cause traced to unbounded ${pick(NOUNS, i + 1)} queries hitting the ${pick(DOMAINS, i + 1)} service under load.`,
    dataPoints: `P99 latency: ${200 + (i % 800)}ms. Error spikes every ${(i % 10) + 1} hours. ${(i % 40) + 5}% of requests affected.`,
    riskFactors: `Cascading failure risk if ${pick(DOMAINS, i + 2)} is unavailable. Rollback requires ${(i % 3) + 1} hours.`,
    competitorAnalysis: `Competitor X solves this with a dedicated ${pick(NOUNS, i + 2)} layer. Competitor Y uses eventual consistency.`,
    decisions: i % 4 === 0 ? [decision('analysis', 1)] : [],
  }

  if (completedStages >= 3) stages.requirements = {
    requirementsList: `1. ${pick(ACTIONS, i + 1)} the ${pick(NOUNS, i)} within 200ms SLA. 2. Support ${(i % 10 + 1) * 100} concurrent users. 3. Maintain backward compatibility with v${(i % 5) + 1} clients.`,
    outOfScope: `Full ${pick(DOMAINS, i + 3)} rewrite, multi-region failover, and ${pick(NOUNS, i + 3)} versioning.`,
    constraints: `Must use existing ${pick(NOUNS, i + 1)} infrastructure. Budget capped at ${(i % 10 + 1) * 5} story points.`,
    edgeCases: `Empty ${pick(NOUNS, i)} state, concurrent mutations, and clock skew between services.`,
    decisions: [],
  }

  if (completedStages >= 4) stages.design = {
    designNotes: `Introduce a ${pick(NOUNS, i + 4)} abstraction layer between the ${pick(DOMAINS, i)} and ${pick(DOMAINS, i + 1)} services to decouple concerns.`,
    uxConsiderations: `Loading states must appear within 100ms. Error messages must be actionable and use plain language.`,
    alternatives: `Alt A: ${pick(ACTIONS, i + 2)} at the DB level. Alt B: client-side ${pick(NOUNS, i + 2)}. Chosen: server-side for consistency.`,
    accessibilityNotes: `All interactive elements need ARIA labels. Focus management required for modal ${pick(NOUNS, i + 4)} flows.`,
    decisions: i % 5 === 0 ? [decision('design', 1), decision('design', 2), decision('design', 3)] : [],
  }

  if (completedStages >= 5) stages.implementation = {
    implementationNotes: `Implemented via a new ${pick(NOUNS, i + 5)} service extracted from the monolith. Feature flag: \`ff_${pick(DOMAINS, i).toLowerCase()}_v2\`.`,
    technicalStack: `TypeScript, Drizzle ORM, ${pick(DOMAINS, i + 1)} SDK v${(i % 5) + 2}.0, Redis for ${pick(NOUNS, i + 5)} caching.`,
    dependencies: `@life-as-code/${pick(DOMAINS, i).toLowerCase()}-sdk@^${(i % 3) + 1}.0.0, zod@^3.0.0`,
    performanceNotes: `Benchmarked at ${500 + (i % 2000)} req/s on p3.medium. Memory footprint: ${(i % 200) + 50}MB.`,
    decisions: i % 6 === 0 ? [decision('implementation', 1)] : [],
  }

  if (completedStages >= 6) stages.validation = {
    validationNotes: `${(i % 5) + 1} rounds of manual testing completed. Automated regression suite covers ${(i % 40) + 60}% of critical paths.`,
    testCases: `TC-${i}-01: happy path. TC-${i}-02: empty state. TC-${i}-03: concurrent mutations. TC-${i}-04: ${pick(ACTIONS, i + 3)} under load.`,
    testEnvironment: `staging-${(i % 3) + 1}.life-as-code.dev — seeded with prod-like data (anonymized).`,
    loadTestingNotes: `k6 load test: 500 VUs for 5 minutes. P99 = ${100 + (i % 400)}ms. No errors at target load.`,
    decisions: [],
  }

  if (completedStages >= 7) stages.documentation = {
    documentationNotes: `API reference, migration guide, and runbook added to /docs/${pick(DOMAINS, i).toLowerCase()}-v${(i % 3) + 2}.`,
    audience: `Internal engineers and ${(i % 2 === 0) ? 'external' : 'partner'} developers integrating with the ${pick(DOMAINS, i)} API.`,
    docFormat: `Markdown + OpenAPI 3.1 spec. Published via the LAC static docs export.`,
    translationNotes: i % 3 === 0 ? `Pending translation to ES, FR, DE. Translation memory updated.` : `English only for v1.`,
    decisions: [],
  }

  if (completedStages >= 8) stages.delivery = {
    deliveryPlan: `Canary release: 1% → 10% → 50% → 100% over ${(i % 7) + 3} days. Feature flag controls rollout.`,
    rolloutStrategy: `Blue-green deployment on k8s. Switch DNS after health checks pass for ${(i % 3) + 2} minutes.`,
    rollbackPlan: `Flip feature flag off within 30s. DB migration is additive-only (backward compatible).`,
    monitoringPlan: `Datadog dashboard: ${pick(DOMAINS, i).toLowerCase()}_v2_latency_p99, error_rate, ${pick(NOUNS, i)}_queue_depth.`,
    decisions: i % 7 === 0 ? [decision('delivery', 1)] : [],
  }

  if (completedStages >= 9) stages.support = {
    supportNotes: `First-line support handled by #${pick(DOMAINS, i).toLowerCase()}-oncall. Escalate to ${pick(ACTORS, i + 1)} if not resolved in 2h.`,
    knownIssues: i % 4 === 0 ? `Known: ${pick(NOUNS, i + 1)} timeout on large payloads (>10MB). Fix scheduled for next sprint.` : `No known issues post-launch.`,
    escalationPath: `L1: #${pick(DOMAINS, i).toLowerCase()}-support → L2: ${pick(ACTORS, i + 2)} → L3: platform-oncall.`,
    slaDefinitions: `P0: 15min response. P1: 1h response. P2: next business day. SLA breach alert via PagerDuty.`,
    decisions: [],
  }

  const tagCount = (i % 4)
  const tags = Array.from({ length: tagCount }, (_, j) => TAGS_POOL[(i + j) % TAGS_POOL.length]!)

  return { title: t, ...stages, tags }
}

function seedStatus(i: number): 'active' | 'draft' | 'flagged' | 'frozen' {
  const r = i % 10
  if (r === 9) return 'frozen'
  if (r === 0 || r === 1) return 'flagged'
  if (r >= 5) return 'active'
  return 'draft'
}

const DEFAULT_ORG_ID = 'default'

export const adminRouter = createTRPCRouter({
  getActiveSchema: publicProcedure
    .input(GetActiveSchemaSchema)
    .query(async ({ ctx }) => {
      const rows = await ctx.db
        .select()
        .from(schemaConfigs)
        .where(eq(schemaConfigs.orgId, DEFAULT_ORG_ID))
        .orderBy(desc(schemaConfigs.updatedAt))
        .limit(1)

      const row = rows[0]
      if (!row) return { id: null, orgId: DEFAULT_ORG_ID, config: DEFAULT_SCHEMA_CONFIG, createdAt: null, updatedAt: null }

      const parsed = SchemaConfigContentSchema.safeParse(row.config)
      if (!parsed.success) return { ...row, config: DEFAULT_SCHEMA_CONFIG }

      return { ...row, config: parsed.data }
    }),

  updateSchema: publicProcedure
    .input(UpdateSchemaSchema)
    .mutation(({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const rows = await tx
          .select()
          .from(schemaConfigs)
          .where(eq(schemaConfigs.orgId, DEFAULT_ORG_ID))
          .orderBy(desc(schemaConfigs.updatedAt))
          .limit(1)

        const existing = rows[0]

        // Parse OLD schema before upsert to compute propagation diff
        const oldConfig = existing
          ? (SchemaConfigContentSchema.safeParse(existing.config).data ?? DEFAULT_SCHEMA_CONFIG)
          : DEFAULT_SCHEMA_CONFIG

        let updated: typeof existing

        if (existing) {
          const [row] = await tx
            .update(schemaConfigs)
            .set({ config: input.config, updatedAt: new Date() })
            .where(eq(schemaConfigs.id, existing.id))
            .returning()
          updated = row
        } else {
          const [row] = await tx
            .insert(schemaConfigs)
            .values({ orgId: DEFAULT_ORG_ID, config: input.config })
            .returning()
          updated = row
        }

        await tx.insert(featureEvents).values({
          featureId: `schema:${DEFAULT_ORG_ID}`,
          orgId: DEFAULT_ORG_ID,
          eventType: EventType.SCHEMA_UPDATED,
          changedFields: input.config as Record<string, unknown>,
          actor: 'admin',
        })

        // Compute newly-required fields (enabled now but not enabled before)
        const oldEnabledRequired = new Set(
          oldConfig.requiredFields.filter((f) => f.enabled).map((f) => f.name),
        )
        const newlyRequiredFields = input.config.requiredFields.filter(
          (f) => f.enabled && !oldEnabledRequired.has(f.name),
        )

        if (newlyRequiredFields.length > 0) {
          // Select all non-frozen features for this org
          const allFeatures = await tx
            .select()
            .from(features)
            .where(and(eq(features.orgId, DEFAULT_ORG_ID), eq(features.frozen, false)))

          const flagOps: Promise<unknown>[] = []

          for (const feature of allFeatures) {
            const content = (feature.content as Record<string, Record<string, unknown>>) ?? {}
            const allFieldValues = Object.values(content).reduce<Record<string, unknown>>(
              (acc, stage) => {
                if (typeof stage === 'object' && stage !== null) {
                  Object.assign(acc, stage as Record<string, unknown>)
                }
                return acc
              },
              {},
            )

            const missingFields = newlyRequiredFields.filter((field) => {
              const v = allFieldValues[field.name]
              return !v || (typeof v === 'string' && !v.trim())
            })

            if (missingFields.length > 0 && feature.status !== 'flagged') {
              flagOps.push(
                tx
                  .update(features)
                  .set({ status: 'flagged', updatedAt: new Date() })
                  .where(eq(features.id, feature.id)),
              )

              for (const field of missingFields) {
                flagOps.push(
                  tx.insert(featureEvents).values({
                    featureId: feature.id,
                    orgId: DEFAULT_ORG_ID,
                    eventType: EventType.ANNOTATION_ADDED,
                    changedFields: { message: `New required field added: ${field.name}` },
                    actor: 'admin',
                  }),
                )
              }
            }
          }

          await Promise.all(flagOps)
        }

        return updated
      })
    }),

  listTemplates: publicProcedure
    .input(ListTemplatesSchema)
    .query(({ ctx }) => {
      return ctx.db
        .select()
        .from(featureTemplates)
        .where(eq(featureTemplates.orgId, DEFAULT_ORG_ID))
        .orderBy(desc(featureTemplates.updatedAt))
    }),

  createTemplate: publicProcedure
    .input(CreateTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(featureTemplates)
        .values({
          orgId: DEFAULT_ORG_ID,
          name: input.name,
          description: input.description ?? null,
          content: input.content,
        })
        .returning()

      if (!created) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      return created
    }),

  updateTemplate: publicProcedure
    .input(UpdateTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const setValues: Partial<typeof featureTemplates.$inferInsert> = { updatedAt: new Date() }
      if (input.name !== undefined) setValues.name = input.name
      if (input.description !== undefined) setValues.description = input.description ?? null
      if (input.content !== undefined) setValues.content = input.content

      const [updated] = await ctx.db
        .update(featureTemplates)
        .set(setValues)
        .where(and(eq(featureTemplates.id, input.id), eq(featureTemplates.orgId, DEFAULT_ORG_ID)))
        .returning()

      if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' })

      return updated
    }),

  cloneTemplate: publicProcedure
    .input(CloneTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const [source] = await ctx.db
        .select()
        .from(featureTemplates)
        .where(and(eq(featureTemplates.id, input.id), eq(featureTemplates.orgId, DEFAULT_ORG_ID)))
        .limit(1)

      if (!source) throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' })

      const [cloned] = await ctx.db
        .insert(featureTemplates)
        .values({
          orgId: DEFAULT_ORG_ID,
          name: `Copy of ${source.name}`,
          description: source.description,
          content: source.content,
        })
        .returning()

      if (!cloned) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      return cloned
    }),

  deleteTemplate: publicProcedure
    .input(DeleteTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(featureTemplates)
        .where(and(eq(featureTemplates.id, input.id), eq(featureTemplates.orgId, DEFAULT_ORG_ID)))
    }),

  exportAll: publicProcedure
    .input(ExportAllSchema)
    .mutation(async ({ ctx, input }) => {
      const whereClause = input.status
        ? and(eq(features.orgId, DEFAULT_ORG_ID), eq(features.status, input.status))
        : eq(features.orgId, DEFAULT_ORG_ID)

      const allFeatures = await ctx.db.select().from(features).where(whereClause)

      const filtered =
        input.tags && input.tags.length > 0
          ? allFeatures.filter((f) => {
              const content = f.content as Record<string, unknown>
              const featureTags = Array.isArray(content.tags) ? (content.tags as string[]) : []
              return input.tags?.some((t) => featureTags.includes(t)) ?? false
            })
          : allFeatures

      const featureIds = filtered.map((f) => f.id)

      const allEvents =
        featureIds.length > 0
          ? await ctx.db
              .select()
              .from(featureEvents)
              .where(inArray(featureEvents.featureId, featureIds))
          : []

      const eventsByFeatureId = new Map<string, typeof allEvents>()
      for (const event of allEvents) {
        const existing = eventsByFeatureId.get(event.featureId) ?? []
        existing.push(event)
        eventsByFeatureId.set(event.featureId, existing)
      }

      return {
        exportedAt: new Date().toISOString(),
        featureCount: filtered.length,
        features: filtered.map((f) => Object.assign({}, f, { events: eventsByFeatureId.get(f.id) ?? [] })),
      }
    }),

  // -------------------------------------------------------------------------
  // Dev / seed mutations
  // -------------------------------------------------------------------------

  seedTestData: publicProcedure
    .input(z.object({ count: z.number().int().min(1).max(10000).default(10000) }))
    .mutation(async ({ ctx, input }) => {
      const { count } = input
      const year = new Date().getFullYear()
      const yearPrefix = `feat-${year}-`

      // Determine the current max key to avoid collisions
      const lastRow = await ctx.db
        .select({ featureKey: features.featureKey })
        .from(features)
        .where(like(features.featureKey, `${yearPrefix}%`))
        .orderBy(desc(features.featureKey))
        .limit(1)

      const startNum = parseInt(lastRow[0]?.featureKey.split('-').at(2) ?? '0', 10) + 1

      // Pre-generate IDs so we can wire up parentIds before insert
      const ids = Array.from({ length: count }, () => crypto.randomUUID())

      // First 70% are roots, remaining 30% get a parentId from the root pool
      const rootCount = Math.ceil(count * 0.7)

      const now = new Date()
      const featureRows = ids.map((id, i) => {
        const completedStages = i % 10  // 0-9 stages filled, even distribution
        const status = seedStatus(i)
        const frozen = status === 'frozen'
        const parentId = i >= rootCount ? ids[(i * 7) % rootCount] ?? null : null

        // ~70% of features get a target period, ~60% get a score
        const targetPeriod = i % 10 < 7 ? pick(TARGET_PERIODS, i) : null
        const score = i % 10 < 6 ? ((i % 9) + 1) : null

        return {
          id,
          featureKey: `${yearPrefix}${String(startNum + i).padStart(3, '0')}`,
          orgId: DEFAULT_ORG_ID,
          status,
          frozen,
          parentId,
          content: seedContent(i, completedStages) as Record<string, unknown>,
          targetPeriod,
          score,
          createdAt: new Date(now.getTime() - (count - i) * 60_000),
          updatedAt: new Date(now.getTime() - Math.floor((count - i) * 0.3) * 60_000),
        }
      })

      // Also build FEATURE_CREATED events for all features (in parallel chunks)
      const eventRows = ids.map((id, i) => ({
        featureId: id,
        orgId: DEFAULT_ORG_ID,
        eventType: EventType.FEATURE_CREATED as 'FEATURE_CREATED',
        changedFields: { seeded: true, batch: Math.floor(i / 500) } as Record<string, unknown>,
        actor: pick(ACTORS, i),
        createdAt: new Date(now.getTime() - (count - i) * 60_000),
      }))

      // Insert features in chunks of 500
      const CHUNK = 500
      for (let start = 0; start < featureRows.length; start += CHUNK) {
        await ctx.db.insert(features).values(featureRows.slice(start, start + CHUNK))
      }

      // Insert events in chunks of 500
      for (let start = 0; start < eventRows.length; start += CHUNK) {
        await ctx.db.insert(featureEvents).values(eventRows.slice(start, start + CHUNK))
      }

      return { inserted: count, startKey: featureRows[0]?.featureKey, endKey: featureRows.at(-1)?.featureKey }
    }),

  deleteAllData: publicProcedure
    .mutation(async ({ ctx }) => {
      // Count before deletion for the return value
      const [countRow] = await ctx.db
        .select({ n: sql<number>`count(*)::int` })
        .from(features)
        .where(eq(features.orgId, DEFAULT_ORG_ID))

      const total = countRow?.n ?? 0

      // Use session_replication_role = replica inside a transaction to bypass
      // the enforce_feature_immutability trigger (which blocks DELETE on frozen rows)
      await ctx.db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL session_replication_role = 'replica'`)
        await tx.delete(featureEvents).where(eq(featureEvents.orgId, DEFAULT_ORG_ID))
        await tx.delete(features).where(eq(features.orgId, DEFAULT_ORG_ID))
      })

      return { deleted: total }
    }),
})
