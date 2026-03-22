import { featureEvents, features, and, asc, desc, eq, ilike, isNotNull, isNull, like, ne, or, schemaConfigs, sql } from '@life-as-code/db'
import { AddAnnotationSchema, AddDecisionSchema, CreateFeatureSchema, DEFAULT_SCHEMA_CONFIG, EventType, FeatureContentSchema, FlagAnnotationSchema, FreezeFeatureSchema, GetFeatureByKeySchema, GetFeatureJsonSchema, GetFeatureSchema, GetLineageSchema, ListAnnotationsSchema, ListFeaturesPagedSchema, SchemaConfigContentSchema, SetPrioritySchema, SetScoreSchema, SetTargetPeriodSchema, SpawnFeatureSchema, UpdateFeatureJsonSchema, UpdateStageSchema, UpdateTagsSchema, UpdateTitleSchema, computeCompletenessFromContent } from '@life-as-code/validators'
import type { AnnotationEntry, DecisionEntry } from '@life-as-code/validators'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createTRPCRouter, publicProcedure } from '@/trpc'
import { adminRouter } from './admin'

const DEFAULT_ORG_ID = 'default'

export const featuresRouter = createTRPCRouter({
  create: publicProcedure
    .input(CreateFeatureSchema)
    .mutation(({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const year = new Date().getFullYear()
        const yearPrefix = `feat-${year}-`

        const lastFeature = await tx
          .select({ featureKey: features.featureKey })
          .from(features)
          .where(like(features.featureKey, `${yearPrefix}%`))
          .orderBy(desc(features.featureKey))
          .limit(1)

        const lastNum = parseInt(lastFeature[0]?.featureKey.split('-').at(2) ?? '0', 10)
        const featureKey = `${yearPrefix}${String(lastNum + 1).padStart(3, '0')}`

        const initialContent = input.templateContent ?? {
          problem: {
            problemStatement: input.problemStatement,
            reporterContext: input.reporterContext ?? '',
          },
        }

        const [feature] = await tx
          .insert(features)
          .values({
            featureKey,
            orgId: DEFAULT_ORG_ID,
            status: 'draft',
            frozen: false,
            content: initialContent,
            completeness_pct: computeCompletenessFromContent(initialContent),
          })
          .returning()

        if (!feature) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

        await tx.insert(featureEvents).values({
          featureId: feature.id,
          orgId: DEFAULT_ORG_ID,
          eventType: EventType.FEATURE_CREATED,
          changedFields: { problemStatement: input.problemStatement },
          actor: 'anonymous',
        })

        return feature
      })
    }),

  updateStage: publicProcedure
    .input(UpdateStageSchema)
    .mutation(({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx.query.features.findFirst({
          where: eq(features.id, input.featureId),
        })
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
        if (existing.frozen) throw new TRPCError({ code: 'FORBIDDEN', message: 'Feature is frozen' })

        // Auto-clear 'flagged' status if all required fields are now filled
        let targetStatus = existing.status

        if (existing.status === 'flagged') {
          const schemaRows = await tx
            .select()
            .from(schemaConfigs)
            .where(eq(schemaConfigs.orgId, DEFAULT_ORG_ID))
            .orderBy(desc(schemaConfigs.updatedAt))
            .limit(1)

          const schemaConfig = schemaRows[0]
            ? (SchemaConfigContentSchema.safeParse(schemaRows[0].config).data ?? DEFAULT_SCHEMA_CONFIG)
            : DEFAULT_SCHEMA_CONFIG

          const enabledRequired = schemaConfig.requiredFields.filter((f) => f.enabled)

          // Build prospective content (what will be in DB after this save)
          const prospectiveContent = {
            ...(existing.content as Record<string, Record<string, unknown>>),
            [input.stage]: input.stageContent,
          }

          const allFieldValues = Object.values(prospectiveContent).reduce<Record<string, unknown>>(
            (acc, stage) => {
              if (typeof stage === 'object' && stage !== null) {
                Object.assign(acc, stage as Record<string, unknown>)
              }
              return acc
            },
            {},
          )

          const allFilled = enabledRequired.every((f) => {
            const v = allFieldValues[f.name]
            return v && (typeof v !== 'string' || v.trim().length > 0)
          })

          if (allFilled) targetStatus = 'active'
        }

        const updatedContent = {
          ...(existing.content as Record<string, unknown>),
          [input.stage]: input.stageContent,
        }

        const [updated] = await tx
          .update(features)
          .set({ content: updatedContent, status: targetStatus, updatedAt: new Date(), completeness_pct: computeCompletenessFromContent(updatedContent) })
          .where(eq(features.id, input.featureId))
          .returning()

        if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

        await tx.insert(featureEvents).values({
          featureId: input.featureId,
          orgId: DEFAULT_ORG_ID,
          eventType: EventType.STAGE_UPDATED,
          changedFields: { stage: input.stage },
          actor: 'anonymous',
        })

        return updated
      })
    }),

  addDecision: publicProcedure
    .input(AddDecisionSchema)
    .mutation(({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx.query.features.findFirst({
          where: eq(features.id, input.featureId),
        })
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
        if (existing.frozen) throw new TRPCError({ code: 'FORBIDDEN', message: 'Feature is frozen' })

        const existingContent = (existing.content as Record<string, unknown>) ?? {}
        const existingStageContent = (existingContent[input.stage] as Record<string, unknown>) ?? {}
        const existingDecisions = (existingStageContent.decisions as DecisionEntry[]) ?? []

        const newEntry: DecisionEntry = {
          id: crypto.randomUUID(),
          ...input.entry,
          createdAt: new Date().toISOString(),
          actor: 'anonymous',
        }

        const [updated] = await tx
          .update(features)
          .set({
            content: {
              ...existingContent,
              [input.stage]: { ...existingStageContent, decisions: [...existingDecisions, newEntry] },
            },
            updatedAt: new Date(),
          })
          .where(eq(features.id, input.featureId))
          .returning()

        if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

        await tx.insert(featureEvents).values({
          featureId: input.featureId,
          orgId: DEFAULT_ORG_ID,
          eventType: EventType.STAGE_UPDATED,
          changedFields: { stage: input.stage, decisionAdded: true },
          actor: 'anonymous',
        })

        return updated
      })
    }),

  updateTags: publicProcedure
    .input(UpdateTagsSchema)
    .mutation(({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx.query.features.findFirst({
          where: eq(features.id, input.featureId),
        })
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
        if (existing.frozen) throw new TRPCError({ code: 'FORBIDDEN', message: 'Feature is frozen' })

        const [updated] = await tx
          .update(features)
          .set({
            content: { ...(existing.content as Record<string, unknown>), tags: input.tags },
            updatedAt: new Date(),
          })
          .where(eq(features.id, input.featureId))
          .returning()

        if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

        await tx.insert(featureEvents).values({
          featureId: input.featureId,
          orgId: DEFAULT_ORG_ID,
          eventType: EventType.STAGE_UPDATED,
          changedFields: { tags: input.tags },
          actor: 'anonymous',
        })

        return updated
      })
    }),

  updateTitle: publicProcedure
    .input(UpdateTitleSchema)
    .mutation(({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx.query.features.findFirst({
          where: eq(features.id, input.featureId),
        })
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
        if (existing.frozen) throw new TRPCError({ code: 'FORBIDDEN', message: 'Feature is frozen' })

        const [updated] = await tx
          .update(features)
          .set({
            content: { ...(existing.content as Record<string, unknown>), title: input.title },
            updatedAt: new Date(),
          })
          .where(eq(features.id, input.featureId))
          .returning()

        if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
        return updated
      })
    }),

  freeze: publicProcedure
    .input(FreezeFeatureSchema)
    .mutation(({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx.query.features.findFirst({
          where: eq(features.id, input.id),
        })
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
        if (existing.frozen) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Feature is already frozen' })

        const [updated] = await tx
          .update(features)
          .set({ frozen: true, status: 'frozen', updatedAt: new Date() })
          .where(eq(features.id, input.id))
          .returning()

        if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

        await tx.insert(featureEvents).values({
          featureId: input.id,
          orgId: DEFAULT_ORG_ID,
          eventType: EventType.FEATURE_FROZEN,
          changedFields: { frozen: true, status: 'frozen' },
          actor: 'anonymous',
        })

        return updated
      })
    }),

  spawn: publicProcedure
    .input(SpawnFeatureSchema)
    .mutation(({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        // Verify parent exists — no frozen guard (AC #3: frozen features can be spawned)
        const parent = await tx.query.features.findFirst({
          where: eq(features.id, input.parentId),
        })
        if (!parent) throw new TRPCError({ code: 'NOT_FOUND', message: 'Parent feature not found' })

        // Generate feature_key using same query-max+1 pattern as create
        const year = new Date().getFullYear()
        const yearPrefix = `feat-${year}-`
        const lastFeature = await tx
          .select({ featureKey: features.featureKey })
          .from(features)
          .where(like(features.featureKey, `${yearPrefix}%`))
          .orderBy(desc(features.featureKey))
          .limit(1)
        const lastNum = parseInt(lastFeature[0]?.featureKey.split('-').at(2) ?? '0', 10)
        const featureKey = `${yearPrefix}${String(lastNum + 1).padStart(3, '0')}`

        const [child] = await tx
          .insert(features)
          .values({
            featureKey,
            orgId: DEFAULT_ORG_ID,
            status: 'draft',
            frozen: false,
            parentId: input.parentId,
            content: { spawn: { spawnReason: input.spawnReason } },
            completeness_pct: 0,
          })
          .returning()

        if (!child) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

        // FEATURE_SPAWNED event for the parent (it was evolved)
        await tx.insert(featureEvents).values({
          featureId: input.parentId,
          orgId: DEFAULT_ORG_ID,
          eventType: EventType.FEATURE_SPAWNED,
          changedFields: {
            childId: child.id,
            childFeatureKey: child.featureKey,
            spawnReason: input.spawnReason,
          },
          actor: 'anonymous',
        })

        // FEATURE_SPAWNED event for the child (it was spawned)
        await tx.insert(featureEvents).values({
          featureId: child.id,
          orgId: DEFAULT_ORG_ID,
          eventType: EventType.FEATURE_SPAWNED,
          changedFields: {
            parentId: input.parentId,
            parentFeatureKey: parent.featureKey,
            spawnReason: input.spawnReason,
          },
          actor: 'anonymous',
        })

        return child
      })
    }),

  getLineage: publicProcedure
    .input(GetLineageSchema)
    .query(async ({ ctx, input }) => {
      const feature = await ctx.db.query.features.findFirst({
        where: eq(features.id, input.id),
      })
      if (!feature) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })

      const [parent, children, siblings] = await Promise.all([
        feature.parentId
          ? ctx.db.query.features.findFirst({ where: eq(features.id, feature.parentId) })
          : Promise.resolve(null),
        ctx.db.select().from(features).where(eq(features.parentId, input.id)),
        feature.parentId
          ? ctx.db
              .select()
              .from(features)
              .where(and(eq(features.parentId, feature.parentId), ne(features.id, input.id)))
          : Promise.resolve([]),
      ])

      return {
        parent: parent ?? null,
        children,
        siblings,
      }
    }),

  getFeature: publicProcedure
    .input(GetFeatureSchema)
    .query(async ({ ctx, input }) => {
      const feature = await ctx.db.query.features.findFirst({
        where: eq(features.id, input.id),
      })
      if (!feature) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
      return feature
    }),

  getFeatureByKey: publicProcedure
    .input(GetFeatureByKeySchema)
    .query(async ({ ctx, input }) => {
      const feature = await ctx.db.query.features.findFirst({
        where: eq(features.featureKey, input.featureKey),
      })
      if (!feature) throw new TRPCError({ code: 'NOT_FOUND', message: `Feature "${input.featureKey}" not found` })
      return feature
    }),

  admin: adminRouter,

  listFeatures: publicProcedure
    .input(z.object({ limit: z.number().int().positive().nullable() }))
    .query(({ ctx, input }) => {
      const q = ctx.db
        .select()
        .from(features)
        .where(eq(features.orgId, DEFAULT_ORG_ID))
        .orderBy(desc(features.updatedAt))
      return input.limit != null ? q.limit(input.limit) : q
    }),

  listFeaturesPaginated: publicProcedure
    .input(ListFeaturesPagedSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor, status, search, completenessLevel } = input

      const conditions = [eq(features.orgId, DEFAULT_ORG_ID)]

      if (status === 'frozen') {
        conditions.push(eq(features.frozen, true))
      } else if (status && status !== 'all') {
        conditions.push(eq(features.status, status))
        conditions.push(eq(features.frozen, false))
      }

      if (search?.trim()) {
        const q = `%${search.trim()}%`
        conditions.push(
          or(
            ilike(features.featureKey, q),
            sql`${features.content}::text ilike ${q}`,
          )!,
        )
      }

      // Server-side completeness filter using the stored completeness_pct column (fast index scan)
      if (completenessLevel) {
        if (completenessLevel === 'needs') {
          conditions.push(sql`${features.completeness_pct} < 40`)
        } else if (completenessLevel === 'partial') {
          conditions.push(sql`${features.completeness_pct} >= 40 and ${features.completeness_pct} < 80`)
        } else {
          conditions.push(sql`${features.completeness_pct} >= 80`)
        }
      }

      const where = and(...conditions)

      const [rows, countResult] = await Promise.all([
        ctx.db
          .select()
          .from(features)
          .where(where)
          .orderBy(desc(features.updatedAt))
          .limit(limit + 1)
          .offset(cursor),
        ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(features)
          .where(where),
      ])

      const hasMore = rows.length > limit
      const total = countResult[0]?.count ?? 0

      return {
        features: hasMore ? rows.slice(0, limit) : rows,
        hasMore,
        nextCursor: hasMore ? cursor + limit : null,
        total,
      }
    }),

  getStats: publicProcedure.query(async ({ ctx }) => {
    const [result] = await ctx.db
      .select({
        total:          sql<number>`count(*)::int`,
        active:         sql<number>`count(*) filter (where status = 'active' and not frozen)::int`,
        draft:          sql<number>`count(*) filter (where status = 'draft' and not frozen)::int`,
        frozen:         sql<number>`count(*) filter (where frozen = true)::int`,
        flagged:        sql<number>`count(*) filter (where status = 'flagged' and not frozen)::int`,
        avgCompleteness: sql<number>`coalesce(round(avg(completeness_pct))::int, 0)`,
        needsAttention: sql<number>`count(*) filter (where completeness_pct < 40)::int`,
      })
      .from(features)
      .where(eq(features.orgId, DEFAULT_ORG_ID))
    return result ?? { total: 0, active: 0, draft: 0, frozen: 0, flagged: 0, avgCompleteness: 0, needsAttention: 0 }
  }),

  listRecent: publicProcedure.query(({ ctx }) => {
    return ctx.db
      .select({
        id:              features.id,
        featureKey:      features.featureKey,
        status:          features.status,
        frozen:          features.frozen,
        score:           features.score,
        updatedAt:       features.updatedAt,
        completeness_pct: features.completeness_pct,
        title:           sql<string>`coalesce(${features.content}->>'title', '')`,
        problem:         sql<string>`coalesce(${features.content}->'problem'->>'problemStatement', '')`,
        tags:            sql<string[]>`coalesce(${features.content}->'tags', '[]'::jsonb)`,
      })
      .from(features)
      .where(eq(features.orgId, DEFAULT_ORG_ID))
      .orderBy(desc(features.updatedAt))
      .limit(6)
  }),

  /** Tree view: only root nodes (parent_id IS NULL) with slim projection + hasChildren flag */
  listRootFeatures: publicProcedure.query(({ ctx }) =>
    ctx.db
      .select({
        id:              features.id,
        featureKey:      features.featureKey,
        status:          features.status,
        frozen:          features.frozen,
        priority:        features.priority,
        updatedAt:       features.updatedAt,
        completeness_pct: features.completeness_pct,
        title:           sql<string>`coalesce(${features.content}->>'title', '')`,
        problem:         sql<string>`coalesce(${features.content}->'problem'->>'problemStatement', '')`,
        hasChildren:     sql<boolean>`exists(select 1 from features c where c.parent_id = features.id and c.org_id = ${DEFAULT_ORG_ID})`,
      })
      .from(features)
      .where(and(eq(features.orgId, DEFAULT_ORG_ID), isNull(features.parentId)))
      .orderBy(asc(features.priority), desc(features.updatedAt))
      .limit(1000)
  ),

  /** Tree view: children of a given parent, fetched on expand */
  getFeatureChildren: publicProcedure
    .input(z.object({ parentId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select({
          id:              features.id,
          featureKey:      features.featureKey,
          status:          features.status,
          frozen:          features.frozen,
          parentId:        features.parentId,
          priority:        features.priority,
          updatedAt:       features.updatedAt,
          completeness_pct: features.completeness_pct,
          title:           sql<string>`coalesce(${features.content}->>'title', '')`,
          problem:         sql<string>`coalesce(${features.content}->'problem'->>'problemStatement', '')`,
          hasChildren:     sql<boolean>`exists(select 1 from features c where c.parent_id = features.id and c.org_id = ${DEFAULT_ORG_ID})`,
        })
        .from(features)
        .where(eq(features.parentId, input.parentId))
        .orderBy(asc(features.priority), desc(features.updatedAt))
        .limit(500)
    ),

  getTimeline: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(2000).default(500) }))
    .query(({ ctx, input }) =>
      ctx.db
        .select({
          id:          features.id,
          featureKey:  features.featureKey,
          status:      features.status,
          frozen:      features.frozen,
          score:       features.score,
          parentId:    features.parentId,
          targetPeriod: features.targetPeriod,
          title:       sql<string>`coalesce(${features.content}->>'title', '')`,
          problem:     sql<string>`coalesce(${features.content}->'problem'->>'problemStatement', '')`,
        })
        .from(features)
        .where(and(eq(features.orgId, DEFAULT_ORG_ID), isNotNull(features.targetPeriod)))
        .orderBy(features.targetPeriod, features.createdAt)
        .limit(input.limit)
    ),

  getFeatureJson: publicProcedure
    .input(GetFeatureJsonSchema)
    .query(async ({ ctx, input }) => {
      const feature = await ctx.db.query.features.findFirst({
        where: eq(features.id, input.id),
      })
      if (!feature) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
      return {
        id: feature.id,
        featureKey: feature.featureKey,
        frozen: feature.frozen,
        content: JSON.stringify(feature.content, null, 2),
      }
    }),

  addAnnotation: publicProcedure
    .input(AddAnnotationSchema)
    .mutation(({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx.query.features.findFirst({
          where: eq(features.id, input.featureId),
        })
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
        // No frozen check — annotations are observational (AC #2)

        const newAnnotation: AnnotationEntry = {
          id: crypto.randomUUID(),
          text: input.text,
          actor: 'anonymous',
          timestamp: new Date().toISOString(),
          flagged: false,
        }

        const existingContent = (existing.content as Record<string, unknown>) ?? {}
        const existingAnnotations = (existingContent.annotations as AnnotationEntry[]) ?? []
        const updatedAnnotations = [...existingAnnotations, newAnnotation]

        const [updated] = await tx
          .update(features)
          .set({
            content: { ...existingContent, annotations: updatedAnnotations },
            updatedAt: new Date(),
          })
          .where(eq(features.id, input.featureId))
          .returning()

        if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

        await tx.insert(featureEvents).values({
          featureId: input.featureId,
          orgId: DEFAULT_ORG_ID,
          eventType: EventType.ANNOTATION_ADDED,
          changedFields: { annotationId: newAnnotation.id, text: input.text },
          actor: newAnnotation.actor,
        })

        return updated
      })
    }),

  listAnnotations: publicProcedure
    .input(ListAnnotationsSchema)
    .query(async ({ ctx, input }) => {
      const feature = await ctx.db.query.features.findFirst({
        where: eq(features.id, input.id),
      })
      if (!feature) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })

      const content = feature.content as { annotations?: AnnotationEntry[] }
      const annotations = content.annotations ?? []
      return annotations.toSorted((a, b) => a.timestamp.localeCompare(b.timestamp))
    }),

  flagAnnotation: publicProcedure
    .input(FlagAnnotationSchema)
    .mutation(({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx.query.features.findFirst({
          where: eq(features.id, input.featureId),
        })
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
        // No frozen check — annotations are observational (AC #2)

        const existingContent = existing.content as { annotations?: AnnotationEntry[]; [key: string]: unknown }
        const annotations = existingContent.annotations ?? []

        const targetAnnotation = annotations.find((a) => a.id === input.annotationId)
        if (!targetAnnotation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Annotation not found' })

        const updatedAnnotations = annotations.map((a) =>
          a.id === input.annotationId ? Object.assign({}, a, { flagged: input.flagged }) : a,
        )

        const hasAnyFlagged = updatedAnnotations.some((a) => a.flagged)
        const newStatus: 'active' | 'flagged' | 'frozen' = hasAnyFlagged
          ? 'flagged'
          : existing.frozen
            ? 'frozen'
            : 'active'

        const updatedContent = { ...existingContent, annotations: updatedAnnotations }

        const [updated] = await tx
          .update(features)
          .set({ content: updatedContent, status: newStatus, updatedAt: new Date() })
          .where(eq(features.id, input.featureId))
          .returning()

        if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

        await tx.insert(featureEvents).values({
          featureId: input.featureId,
          orgId: DEFAULT_ORG_ID,
          eventType: EventType.FEATURE_UPDATED,
          changedFields: {
            annotationId: input.annotationId,
            flagged: input.flagged,
            statusChange: { from: existing.status, to: newStatus },
          },
          actor: 'anonymous',
        })

        return updated
      })
    }),

  setPriority: publicProcedure
    .input(SetPrioritySchema)
    .mutation(({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx.query.features.findFirst({
          where: eq(features.id, input.featureId),
        })
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
        if (existing.frozen) throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot set priority on a frozen feature' })

        const [updated] = await tx
          .update(features)
          .set({ priority: input.priority, updatedAt: new Date() })
          .where(eq(features.id, input.featureId))
          .returning()

        if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

        await tx.insert(featureEvents).values({
          featureId: input.featureId,
          orgId: DEFAULT_ORG_ID,
          eventType: EventType.FEATURE_UPDATED,
          changedFields: { priority: { from: existing.priority, to: input.priority } },
          actor: 'anonymous',
        })

        return updated
      })
    }),

  setScore: publicProcedure
    .input(SetScoreSchema)
    .mutation(({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx.query.features.findFirst({
          where: eq(features.id, input.featureId),
        })
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
        if (existing.frozen) throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot score a frozen feature' })

        const [updated] = await tx
          .update(features)
          .set({ score: input.score, updatedAt: new Date() })
          .where(eq(features.id, input.featureId))
          .returning()

        if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

        await tx.insert(featureEvents).values({
          featureId: input.featureId,
          orgId: DEFAULT_ORG_ID,
          eventType: EventType.FEATURE_UPDATED,
          changedFields: { score: { from: existing.score, to: input.score } },
          actor: 'anonymous',
        })

        return updated
      })
    }),

  setTargetPeriod: publicProcedure
    .input(SetTargetPeriodSchema)
    .mutation(({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx.query.features.findFirst({
          where: eq(features.id, input.featureId),
        })
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
        if (existing.frozen) throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot set target period on a frozen feature' })

        const [updated] = await tx
          .update(features)
          .set({ targetPeriod: input.targetPeriod, updatedAt: new Date() })
          .where(eq(features.id, input.featureId))
          .returning()

        if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

        await tx.insert(featureEvents).values({
          featureId: input.featureId,
          orgId: DEFAULT_ORG_ID,
          eventType: EventType.FEATURE_UPDATED,
          changedFields: { targetPeriod: { from: existing.targetPeriod, to: input.targetPeriod } },
          actor: 'anonymous',
        })

        return updated
      })
    }),

  updateFeatureJson: publicProcedure
    .input(UpdateFeatureJsonSchema)
    .mutation(({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx.query.features.findFirst({
          where: eq(features.id, input.id),
        })
        if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
        if (existing.frozen) throw new TRPCError({ code: 'FORBIDDEN', message: 'Feature is frozen' })

        let parsed: unknown
        try {
          parsed = JSON.parse(input.jsonContent)
        } catch {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid JSON: could not parse input' })
        }

        const result = FeatureContentSchema.safeParse(parsed)
        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error.issues
              .map((i) => `${i.path.join('.')}: ${i.message}`)
              .join('; '),
          })
        }

        const oldContent = (existing.content ?? {}) as Record<string, unknown>
        const newContent = result.data as Record<string, unknown>
        const changedKeys = Object.keys({ ...oldContent, ...newContent }).filter(
          (k) => JSON.stringify(oldContent[k]) !== JSON.stringify(newContent[k]),
        )

        const [updated] = await tx
          .update(features)
          .set({ content: result.data, updatedAt: new Date(), completeness_pct: computeCompletenessFromContent(result.data) })
          .where(eq(features.id, input.id))
          .returning()

        if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

        await tx.insert(featureEvents).values({
          featureId: input.id,
          orgId: DEFAULT_ORG_ID,
          eventType: EventType.FEATURE_UPDATED,
          changedFields: { updatedViaJson: true, changedKeys },
          actor: 'anonymous',
        })

        return updated
      })
    }),

  /** Graph view: all features with slim projection for force-directed graph */
  listAllForGraph: publicProcedure.query(({ ctx }) =>
    ctx.db
      .select({
        id:              features.id,
        featureKey:      features.featureKey,
        parentId:        features.parentId,
        status:          features.status,
        frozen:          features.frozen,
        completeness_pct: features.completeness_pct,
        title:           sql<string>`coalesce(nullif(${features.content}->>'title', ''), nullif(${features.content}->'problem'->>'problemStatement', ''), ${features.featureKey})`,
      })
      .from(features)
      .where(eq(features.orgId, DEFAULT_ORG_ID))
      .limit(2000)
  ),
})
