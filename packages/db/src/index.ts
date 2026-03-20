import { env } from '@life-as-code/validators/env'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

import * as schema from './schema'

const createDrizzleClient = () => {
  // prepare: false is required for Supabase's transaction pooler (PgBouncer)
  const client = postgres(env.DATABASE_URL, { prepare: false })
  return drizzle({ client, casing: 'snake_case', schema })
}

const globalForDrizzle = globalThis as unknown as {
  db: ReturnType<typeof createDrizzleClient> | undefined
}
export const db = globalForDrizzle.db ?? createDrizzleClient()
if (env.NODE_ENV !== 'production') globalForDrizzle.db = db

export * from 'drizzle-orm'
export * from './schema'
