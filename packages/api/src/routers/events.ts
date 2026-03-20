import { desc, eq, featureEvents } from '@life-as-code/db'
import { ListFeatureEventsSchema } from '@life-as-code/validators/audit'

import { createTRPCRouter, publicProcedure } from '@/trpc'

const PAGE_LIMIT = 20

export const eventsRouter = createTRPCRouter({
  listFeatureEvents: publicProcedure
    .input(ListFeatureEventsSchema)
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(featureEvents)
        .where(eq(featureEvents.featureId, input.id))
        .orderBy(desc(featureEvents.createdAt))
        .limit(PAGE_LIMIT + 1)
        .offset(input.cursor)

      const hasMore = rows.length > PAGE_LIMIT
      return {
        events: hasMore ? rows.slice(0, PAGE_LIMIT) : rows,
        hasMore,
        nextCursor: hasMore ? input.cursor + PAGE_LIMIT : null,
      }
    }),
})
