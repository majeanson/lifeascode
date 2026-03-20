import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'

import { createTRPCRouter, publicProcedure } from '@/trpc'
import { eventsRouter } from './events'
import { featuresRouter } from './features'
import { searchRouter } from './search'

const appRouter = createTRPCRouter({
  health: publicProcedure
    .meta({ message: 'Health check successful' })
    .query(() => ({ message: 'OK' })),
  features: featuresRouter,
  search: searchRouter,
  events: eventsRouter,
})

type AppRouter = typeof appRouter

type RouterInputs = inferRouterInputs<AppRouter>
type RouterOutputs = inferRouterOutputs<AppRouter>

export type { AppRouter, RouterInputs, RouterOutputs }
export { appRouter }
