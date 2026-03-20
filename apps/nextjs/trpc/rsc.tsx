import { cache } from 'react'

import { appRouter, createCaller, createTRPCContext } from '@life-as-code/api'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'

import { getQueryClient } from '@/lib/query-client'

interface Options {
  headers: Headers
}

const createRscContext = cache((opts: Options) => {
  const heads = new Headers(opts.headers)
  heads.set('x-trpc-source', 'rsc')

  return createTRPCContext({ headers: heads })
})

const createApi = (opts: Options) => createCaller(() => createRscContext(opts))

const createTRPC = (opts: Options) =>
  createTRPCOptionsProxy({
    ctx: () => createRscContext(opts),
    queryClient: getQueryClient,
    router: appRouter,
  })

function HydrateClient({ children }: Readonly<{ children: React.ReactNode }>) {
  const queryClient = getQueryClient()

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  )
}

export { createApi, createTRPC, getQueryClient, HydrateClient }
