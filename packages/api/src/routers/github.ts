import { db as dbClient, and, desc, eq, features, featureEvents, githubSources } from '@life-as-code/db'
import {
  ConnectGithubSourceSchema,
  DisconnectGithubSourceSchema,
  EventType,
  GithubFeatureFileSchema,
  SyncGithubSourceSchema,
  computeCompletenessFromContent,
} from '@life-as-code/validators'
import { TRPCError } from '@trpc/server'

import { createTRPCRouter, publicProcedure } from '@/trpc'

type DB = typeof dbClient

const DEFAULT_ORG_ID = 'default'

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

interface GitTreeItem {
  path: string
  sha: string
  type: 'blob' | 'tree'
  url: string
}

interface GitTreeResponse {
  tree: GitTreeItem[]
  truncated: boolean
}

interface GitBlobResponse {
  content: string   // base64
  encoding: string
  sha: string
}

async function fetchGitTree(
  owner: string,
  repo: string,
  branch: string,
  pat: string,
): Promise<GitTreeResponse> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub tree fetch failed (${res.status}): ${body}`)
  }
  return res.json() as Promise<GitTreeResponse>
}

async function fetchBlob(url: string, pat: string): Promise<GitBlobResponse> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!res.ok) throw new Error(`GitHub blob fetch failed (${res.status})`)
  return res.json() as Promise<GitBlobResponse>
}

function decodeBase64(encoded: string): string {
  return Buffer.from(encoded.replace(/\n/g, ''), 'base64').toString('utf-8')
}

// ---------------------------------------------------------------------------
// Sync logic
// ---------------------------------------------------------------------------

async function syncSource(db: DB, sourceId: string) {
  const [source] = await db
    .select()
    .from(githubSources)
    .where(eq(githubSources.id, sourceId))
    .limit(1)

  if (!source) throw new TRPCError({ code: 'NOT_FOUND', message: 'Source not found' })

  // Mark as syncing
  await db
    .update(githubSources)
    .set({ syncStatus: 'syncing', updatedAt: new Date() })
    .where(eq(githubSources.id, sourceId))

  try {
    const tree = await fetchGitTree(source.owner, source.repo, source.branch, source.pat)

    // Find all feature.json files
    const featureFiles = tree.tree.filter(
      (item) => item.type === 'blob' && item.path.endsWith('/feature.json') || item.path === 'feature.json',
    )

    let upserted = 0
    let skipped = 0
    let errors = 0

    for (const file of featureFiles) {
      try {
        // Skip files we already have at this exact SHA
        const [existing] = await db
          .select({ id: features.id, githubSha: features.githubSha })
          .from(features)
          .where(
            and(
              eq(features.githubSourceId, sourceId),
              eq(features.githubPath, file.path),
            ),
          )
          .limit(1)

        if (existing?.githubSha === file.sha) {
          skipped++
          continue
        }

        // Fetch and parse content
        const blob = await fetchBlob(file.url, source.pat)
        const raw = decodeBase64(blob.content)
        const json = JSON.parse(raw) as unknown

        const parsed = GithubFeatureFileSchema.safeParse(json)
        if (!parsed.success) {
          console.warn(`[github-sync] Skipping ${file.path}: invalid schema`, parsed.error.flatten())
          errors++
          continue
        }

        const { featureKey, status, title, tags, successCriteria, domain, ...rest } = parsed.data

        // Build content (everything except featureKey/status which are top-level columns)
        const content: Record<string, unknown> = { ...rest }
        if (title) content.title = title
        if (tags) content.tags = tags
        if (successCriteria) content.successCriteria = successCriteria
        if (domain) content.domain = domain

        const completeness = computeCompletenessFromContent(content)
        const resolvedStatus = status ?? 'active'

        if (existing) {
          // Update existing
          await db
            .update(features)
            .set({
              status: resolvedStatus,
              content,
              completeness_pct: completeness,
              githubSha: file.sha,
              updatedAt: new Date(),
            })
            .where(eq(features.id, existing.id))

          await db.insert(featureEvents).values({
            featureId: existing.id,
            orgId: DEFAULT_ORG_ID,
            eventType: EventType.FEATURE_UPDATED,
            changedFields: { githubSync: true, path: file.path, sha: file.sha },
            actor: `github:${source.owner}/${source.repo}`,
          })
        } else {
          // Insert new
          const [created] = await db
            .insert(features)
            .values({
              featureKey,
              orgId: DEFAULT_ORG_ID,
              status: resolvedStatus,
              frozen: resolvedStatus === 'frozen',
              content,
              completeness_pct: completeness,
              githubSourceId: sourceId,
              githubPath: file.path,
              githubSha: file.sha,
            })
            .returning({ id: features.id })

          if (created) {
            await db.insert(featureEvents).values({
              featureId: created.id,
              orgId: DEFAULT_ORG_ID,
              eventType: EventType.FEATURE_CREATED,
              changedFields: { githubSync: true, path: file.path, sha: file.sha },
              actor: `github:${source.owner}/${source.repo}`,
            })
          }
        }

        upserted++
      } catch (err) {
        console.error(`[github-sync] Error processing ${file.path}:`, err)
        errors++
      }
    }

    // Mark idle with timestamp
    await db
      .update(githubSources)
      .set({
        syncStatus: 'idle',
        lastSyncedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(githubSources.id, sourceId))

    return { upserted, skipped, errors, total: featureFiles.length }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await db
      .update(githubSources)
      .set({ syncStatus: 'error', lastError: message, updatedAt: new Date() })
      .where(eq(githubSources.id, sourceId))
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message })
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const githubRouter = createTRPCRouter({
  /** List all connected GitHub sources */
  list: publicProcedure.query(({ ctx }) => {
    return ctx.db
      .select({
        id: githubSources.id,
        owner: githubSources.owner,
        repo: githubSources.repo,
        branch: githubSources.branch,
        syncStatus: githubSources.syncStatus,
        lastSyncedAt: githubSources.lastSyncedAt,
        lastError: githubSources.lastError,
        createdAt: githubSources.createdAt,
      })
      .from(githubSources)
      .where(eq(githubSources.orgId, DEFAULT_ORG_ID))
      .orderBy(desc(githubSources.createdAt))
  }),

  /** Connect a new GitHub repo — validates PAT then does an initial sync */
  connect: publicProcedure
    .input(ConnectGithubSourceSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify PAT works before saving
      const testRes = await fetch(
        `https://api.github.com/repos/${input.owner}/${input.repo}`,
        {
          headers: {
            Authorization: `Bearer ${input.pat}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      )
      if (!testRes.ok) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: testRes.status === 404
            ? `Repo ${input.owner}/${input.repo} not found — check owner, repo name, and PAT permissions`
            : `GitHub returned ${testRes.status} — check your PAT`,
        })
      }

      const [source] = await ctx.db
        .insert(githubSources)
        .values({
          orgId: DEFAULT_ORG_ID,
          owner: input.owner,
          repo: input.repo,
          branch: input.branch,
          pat: input.pat,
        })
        .returning()

      if (!source) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      // Kick off initial sync (fire-and-forget is fine here — UI can poll status)
      syncSource(ctx.db, source.id).catch((err) =>
        console.error('[github-sync] Initial sync failed:', err),
      )

      return source
    }),

  /** Manually trigger a sync for a source */
  sync: publicProcedure
    .input(SyncGithubSourceSchema)
    .mutation(async ({ ctx, input }) => {
      return syncSource(ctx.db, input.id)
    }),

  /** Remove a GitHub source — leaves imported features in DB */
  disconnect: publicProcedure
    .input(DisconnectGithubSourceSchema)
    .mutation(async ({ ctx, input }) => {
      // Null out github fields on features so they become DB-native
      await ctx.db
        .update(features)
        .set({ githubSourceId: null, githubPath: null, githubSha: null, updatedAt: new Date() })
        .where(eq(features.githubSourceId, input.id))

      await ctx.db
        .delete(githubSources)
        .where(
          and(
            eq(githubSources.id, input.id),
            eq(githubSources.orgId, DEFAULT_ORG_ID),
          ),
        )

      return { ok: true }
    }),
})
