import { revalidateTag } from 'next/cache'

import { handler as trpcHandler } from '@life-as-code/api'

import { FEATURE_STATS_TAG } from '@/lib/cached-stats'

/**
 * tRPC route handler with Next.js cache invalidation.
 *
 * After any mutation that changes feature count or status, we revalidate the
 * cached stats so the next RSC render gets fresh numbers.
 */

// Procedures whose mutations change aggregate stats (total, active, draft, frozen counts)
const STAT_MUTATING_PROCEDURES = new Set([
  'features.create',
  'features.freeze',
  'features.spawn',
  'features.flagAnnotation',
])

async function handler(request: Request): Promise<Response> {
  const response = await trpcHandler(request)

  // Revalidate stats cache after successful mutations
  if (request.method === 'POST' && response.ok) {
    const url = new URL(request.url)
    // tRPC path: /api/trpc/features.create  or  /api/trpc/features.create,features.getStats (batch)
    const trpcSegment = url.pathname.split('/api/trpc/')[1] ?? ''
    const procedures = trpcSegment.split(',')
    if (procedures.some((p) => STAT_MUTATING_PROCEDURES.has(p.split('?')[0] ?? ''))) {
      revalidateTag(FEATURE_STATS_TAG, 'minutes')
    }
  }

  return response
}

export { handler as GET, handler as POST, handler as OPTIONS }
