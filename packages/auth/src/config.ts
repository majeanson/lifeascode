import type { NextAuthConfig } from 'next-auth'

import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@life-as-code/db'
import { env } from '@life-as-code/validators/env'
import Discord from 'next-auth/providers/discord'

const adapter = DrizzleAdapter(db)

const authOptions: NextAuthConfig = {
  adapter,
  trustHost: true,
  providers: env.AUTH_DISCORD_ID && env.AUTH_DISCORD_SECRET
    ? [Discord({ clientId: env.AUTH_DISCORD_ID, clientSecret: env.AUTH_DISCORD_SECRET })]
    : [],
}

async function validateSessionToken(token: string) {
  const session = await adapter.getSessionAndUser?.(token)
  return session
    ? {
        user: { ...session.user },
        expires: session.session.expires.toISOString(),
      }
    : null
}

async function invalidateSessionToken(token: string) {
  await adapter.deleteSession?.(token)
}

export { authOptions, validateSessionToken, invalidateSessionToken }
