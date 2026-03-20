import { watch } from 'node:fs'
import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

import { db, eq, features } from '@life-as-code/db'

const DEFAULT_ORG_ID = 'default'

interface FeatureJson {
  featureKey: string
  status?: 'active' | 'draft' | 'frozen' | 'flagged'
  frozen?: boolean
  parentId?: string | null
  content?: Record<string, unknown>
  [key: string]: unknown
}

function isFeatureJson(obj: unknown): obj is FeatureJson {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Record<string, unknown>).featureKey === 'string'
  )
}

async function readFeatureJson(filePath: string): Promise<FeatureJson | null> {
  try {
    const raw = await readFile(filePath, 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (!isFeatureJson(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

async function upsertFeature(featureJson: FeatureJson): Promise<void> {
  const { featureKey } = featureJson
  const status = featureJson.status ?? 'draft'
  const frozen = featureJson.frozen ?? false
  const parentId = featureJson.parentId ?? null
  const content: Record<string, unknown> = featureJson.content ?? {}

  const existing = await db.query.features.findFirst({
    where: eq(features.featureKey, featureKey),
  })

  if (existing) {
    await db
      .update(features)
      .set({ status, frozen, parentId: parentId ?? undefined, content, updatedAt: new Date() })
      .where(eq(features.featureKey, featureKey))
  } else {
    await db.insert(features).values({
      featureKey,
      orgId: DEFAULT_ORG_ID,
      status,
      frozen,
      parentId: parentId ?? undefined,
      content,
    })
  }

  console.log(`lac-watcher: synced ${featureKey}`)
}

async function deprecateFeatureByPath(filePath: string): Promise<void> {
  // Extract featureKey from filename: feat-YYYY-NNN.json
  const fileName = filePath.split('/').at(-1) ?? filePath.split('\\').at(-1) ?? ''
  const featureKey = fileName.replace(/\.json$/, '')
  if (!featureKey.startsWith('feat-')) return

  const existing = await db.query.features.findFirst({
    where: eq(features.featureKey, featureKey),
  })
  if (!existing) return

  await db
    .update(features)
    .set({ status: 'draft', updatedAt: new Date() })
    .where(eq(features.featureKey, featureKey))

  console.log(`lac-watcher: deprecated ${featureKey} (file removed)`)
}

async function scanDir(dir: string): Promise<string[]> {
  const results: string[] = []
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return results
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    try {
      const info = await stat(fullPath)
      if (info.isDirectory()) {
        const nested = await scanDir(fullPath)
        results.push(...nested)
      } else if (entry === 'feature.json' || /^feat-\d{4}-\d{3}\.json$/.test(entry)) {
        results.push(fullPath)
      }
    } catch {
      // skip unreadable entries
    }
  }
  return results
}

export async function startLacWatcher(dir: string): Promise<void> {
  console.log(`lac-watcher: monitoring ${dir}`)

  // Initial scan on startup
  const files = await scanDir(dir)
  for (const filePath of files) {
    const featureJson = await readFeatureJson(filePath)
    if (featureJson) {
      await upsertFeature(featureJson)
    }
  }

  // Debounce map to avoid duplicate events
  const pending = new Map<string, ReturnType<typeof setTimeout>>()

  watch(dir, { recursive: true }, (eventType, filename) => {
    if (!filename) return
    const lowerName = filename.toLowerCase()
    if (!lowerName.endsWith('.json')) return

    const fullPath = join(dir, filename)

    // Debounce rapid events for the same file
    const existing = pending.get(fullPath)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(() => {
      pending.delete(fullPath)
      void (async () => {
        if (eventType === 'rename') {
          // 'rename' fires on both create and delete — check if file exists
          try {
            await stat(fullPath)
            // File exists → upsert
            const featureJson = await readFeatureJson(fullPath)
            if (featureJson) await upsertFeature(featureJson)
          } catch {
            // File gone → deprecate
            await deprecateFeatureByPath(fullPath)
          }
        } else if (eventType === 'change') {
          const featureJson = await readFeatureJson(fullPath)
          if (featureJson) await upsertFeature(featureJson)
        }
      })()
    }, 300)

    pending.set(fullPath, timer)
  })
}
