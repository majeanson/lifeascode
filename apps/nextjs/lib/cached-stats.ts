import { unstable_cache } from 'next/cache'

import { db, eq, features, sql } from '@life-as-code/db'

const DEFAULT_ORG_ID = 'default'

/** Cache tag used for Next.js page cache invalidation */
export const FEATURE_STATS_TAG = 'feature-stats'

/**
 * Cached aggregate stats — re-computed at most once per 60 seconds.
 * Invalidated via revalidateTag(FEATURE_STATS_TAG) after create/freeze/spawn mutations.
 */
export const getCachedStats = unstable_cache(
  async () => {
    const [result] = await db
      .select({
        total:           sql<number>`count(*)::int`,
        active:          sql<number>`count(*) filter (where status = 'active' and not frozen)::int`,
        draft:           sql<number>`count(*) filter (where status = 'draft' and not frozen)::int`,
        frozen:          sql<number>`count(*) filter (where frozen = true)::int`,
        flagged:         sql<number>`count(*) filter (where status = 'flagged' and not frozen)::int`,
        avgCompleteness: sql<number>`coalesce(round(avg(completeness_pct))::int, 0)`,
        needsAttention:  sql<number>`count(*) filter (where completeness_pct < 40)::int`,
      })
      .from(features)
      .where(eq(features.orgId, DEFAULT_ORG_ID))
    return result ?? { total: 0, active: 0, draft: 0, frozen: 0, flagged: 0, avgCompleteness: 0, needsAttention: 0 }
  },
  [FEATURE_STATS_TAG],
  { revalidate: 60, tags: [FEATURE_STATS_TAG] },
)
