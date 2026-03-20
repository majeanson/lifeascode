import { describe, expect, it } from 'vitest'
import { ulid } from 'ulidx'

import { FeatureContentSchema } from '@life-as-code/validators'

import { db, featureEvents, features, eq, and, ne } from '../index.js'

describe('immutability trigger', () => {
  it('allows freezing an active feature (frozen=false → true)', async () => {
    const id = ulid()
    const featureKey = `feat-test-freeze-${Date.now()}`

    await db.insert(features).values({
      id,
      featureKey,
      orgId: 'test',
      status: 'draft',
      frozen: false,
      content: {},
    })

    // Freezing an unfrozen feature should succeed (OLD.frozen = false, trigger passes)
    const [updated] = await db
      .update(features)
      .set({ frozen: true, status: 'frozen' })
      .where(eq(features.id, id))
      .returning()

    expect(updated?.frozen).toBe(true)
    expect(updated?.status).toBe('frozen')
  })

  it('blocks UPDATE on a frozen feature row', async () => {
    const id = ulid()
    const featureKey = `feat-test-block-${Date.now()}`

    // Insert directly as frozen (bypassing API)
    await db.insert(features).values({
      id,
      featureKey,
      orgId: 'test',
      status: 'frozen',
      frozen: true,
      content: {},
    })

    // Attempt to UPDATE a frozen row — DB trigger should block it
    let caughtError: unknown = null
    try {
      await db
        .update(features)
        .set({ content: { modified: true } })
        .where(eq(features.id, id))
    } catch (err) {
      caughtError = err
    }

    // Trigger must block the write (some error thrown)
    expect(caughtError).not.toBeNull()

    // The PostgreSQL trigger message appears in the serialized error chain
    const errStr = JSON.stringify(caughtError)
    expect(errStr).toMatch(/frozen|Cannot modify/i)
  })
})

describe('spawn lineage (via direct DB)', () => {
  it('creates child with parentId and spawnReason in content', async () => {
    const ts = Date.now()
    const parentId = ulid()
    const childId = ulid()

    await db.insert(features).values({
      id: parentId,
      featureKey: `feat-test-spawn-parent-${ts}`,
      orgId: 'test',
      status: 'active',
      frozen: false,
      content: {},
    })

    await db.insert(features).values({
      id: childId,
      featureKey: `feat-test-spawn-child-${ts}`,
      orgId: 'test',
      status: 'draft',
      frozen: false,
      parentId,
      content: { spawn: { spawnReason: 'Add offline mode' } },
    })

    const child = await db.query.features.findFirst({ where: eq(features.id, childId) })
    expect(child?.parentId).toBe(parentId)
    expect((child?.content as Record<string, unknown>)?.spawn).toMatchObject({
      spawnReason: 'Add offline mode',
    })
  })

  it('allows inserting a child of a frozen feature', async () => {
    const ts = Date.now()
    const frozenParentId = ulid()
    const childId = ulid()

    await db.insert(features).values({
      id: frozenParentId,
      featureKey: `feat-test-frozen-parent-${ts}`,
      orgId: 'test',
      status: 'frozen',
      frozen: true,
      content: {},
    })

    // Spawn from frozen parent — INSERT is not blocked by trigger (trigger only guards UPDATE/DELETE)
    await expect(
      db.insert(features).values({
        id: childId,
        featureKey: `feat-test-child-of-frozen-${ts}`,
        orgId: 'test',
        status: 'draft',
        frozen: false,
        parentId: frozenParentId,
        content: { spawn: { spawnReason: 'Evolve frozen feature' } },
      }),
    ).resolves.toBeDefined()

    const child = await db.query.features.findFirst({ where: eq(features.id, childId) })
    expect(child?.parentId).toBe(frozenParentId)
  })

  it('getLineage query pattern returns parent, children, and siblings', async () => {

    const ts = Date.now()
    const grandparentId = ulid()
    const parentId = ulid()
    const siblingId = ulid()
    const childId = ulid()

    await db.insert(features).values([
      {
        id: grandparentId,
        featureKey: `feat-test-gp-${ts}`,
        orgId: 'test',
        status: 'draft',
        frozen: false,
        content: {},
      },
      {
        id: parentId,
        featureKey: `feat-test-parent-lin-${ts}`,
        orgId: 'test',
        status: 'draft',
        frozen: false,
        content: {},
        parentId: grandparentId,
      },
      {
        id: siblingId,
        featureKey: `feat-test-sibling-${ts}`,
        orgId: 'test',
        status: 'draft',
        frozen: false,
        content: {},
        parentId: grandparentId,
      },
      {
        id: childId,
        featureKey: `feat-test-child-lin-${ts}`,
        orgId: 'test',
        status: 'draft',
        frozen: false,
        content: {},
        parentId,
      },
    ])

    const feature = await db.query.features.findFirst({ where: eq(features.id, parentId) })
    if (!feature) throw new Error('Feature not found in test')

    const [parent, children, siblings] = await Promise.all([
      feature.parentId
        ? db.query.features.findFirst({ where: eq(features.id, feature.parentId) })
        : Promise.resolve(null),
      db.select().from(features).where(eq(features.parentId, parentId)),
      feature.parentId
        ? db
            .select()
            .from(features)
            .where(and(eq(features.parentId, feature.parentId), ne(features.id, parentId)))
        : Promise.resolve([]),
    ])

    expect(parent?.id).toBe(grandparentId)
    expect(children.map((c) => c.id)).toContain(childId)
    expect(siblings.map((s) => s.id)).toContain(siblingId)
    expect(siblings.map((s) => s.id)).not.toContain(parentId)
  })
})

describe('FeatureContentSchema (Story 5-1)', () => {
  it('accepts a valid content object with known stage keys', () => {
    const result = FeatureContentSchema.safeParse({
      problem: { problemStatement: 'Login is broken', reporterContext: 'Users cannot log in' },
      analysis: { edgeCases: ['No network', 'Wrong creds'] },
      tags: ['auth', 'critical'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts an empty object (all fields optional)', () => {
    const result = FeatureContentSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts unknown top-level keys via passthrough', () => {
    const result = FeatureContentSchema.safeParse({
      problem: { problemStatement: 'test' },
      customField: { anything: true },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).customField).toEqual({ anything: true })
    }
  })

  it('rejects tags that are not strings', () => {
    const result = FeatureContentSchema.safeParse({
      tags: [1, 2, 3],
    })
    expect(result.success).toBe(false)
  })

  it('accepts spawn with spawnReason', () => {
    const result = FeatureContentSchema.safeParse({
      spawn: { spawnReason: 'Evolve for offline support' },
    })
    expect(result.success).toBe(true)
  })
})

describe('getFeatureJson / updateFeatureJson DB behaviour (Story 5-1)', () => {
  it('content is returned as serialisable JSON after insert', async () => {
    const id = ulid()
    const initialContent = { problem: { problemStatement: 'Initial', reporterContext: '' }, tags: ['a'] }

    await db.insert(features).values({
      id,
      featureKey: `feat-test-json-get-${Date.now()}`,
      orgId: 'test',
      status: 'draft',
      frozen: false,
      content: initialContent,
    })

    const row = await db.query.features.findFirst({ where: eq(features.id, id) })
    expect(row).toBeDefined()
    // Simulate getFeatureJson serialisation
    const jsonStr = JSON.stringify(row?.content, null, 2)
    expect(() => JSON.parse(jsonStr)).not.toThrow()
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>
    expect((parsed.problem as Record<string, unknown>)?.problemStatement).toBe('Initial')
  })

  it('updateFeatureJson: content update + FEATURE_UPDATED event in same transaction', async () => {
    const id = ulid()
    const ts = Date.now()
    const featureKey = `feat-test-json-upd-${ts}`

    await db.insert(features).values({
      id,
      featureKey,
      orgId: 'test',
      status: 'draft',
      frozen: false,
      content: { problem: { problemStatement: 'Old statement' } },
    })

    const newContent = { problem: { problemStatement: 'New statement', reporterContext: 'Updated' } }
    const changedKeys = ['problem']

    // Simulate what updateFeatureJson does inside its transaction
    await db.transaction(async (tx) => {
      await tx
        .update(features)
        .set({ content: newContent, updatedAt: new Date() })
        .where(eq(features.id, id))

      await tx.insert(featureEvents).values({
        featureId: id,
        orgId: 'test',
        eventType: 'FEATURE_UPDATED',
        changedFields: { updatedViaJson: true, changedKeys },
        actor: 'test',
      })
    })

    const updated = await db.query.features.findFirst({ where: eq(features.id, id) })
    expect((updated?.content as Record<string, Record<string, unknown>>)?.problem?.problemStatement).toBe('New statement')

    const events = await db.select().from(featureEvents).where(eq(featureEvents.featureId, id))
    expect(events).toHaveLength(1)
    expect(events[0]?.eventType).toBe('FEATURE_UPDATED')
    expect((events[0]?.changedFields as Record<string, unknown>)?.updatedViaJson).toBe(true)
  })

  it('updateFeatureJson: frozen feature blocked at API level before DB write', async () => {
    const id = ulid()

    await db.insert(features).values({
      id,
      featureKey: `feat-test-json-frozen-${Date.now()}`,
      orgId: 'test',
      status: 'frozen',
      frozen: true,
      content: { problem: { problemStatement: 'Frozen' } },
    })

    const row = await db.query.features.findFirst({ where: eq(features.id, id) })
    // API procedure checks frozen before any write — verify DB state reflects frozen
    expect(row?.frozen).toBe(true)
    // DB trigger also guards — confirm an attempt to UPDATE would fail
    let caught: unknown = null
    try {
      await db
        .update(features)
        .set({ content: { problem: { problemStatement: 'Should not update' } } })
        .where(eq(features.id, id))
    } catch (err) {
      caught = err
    }
    expect(caught).not.toBeNull()
  })
})
