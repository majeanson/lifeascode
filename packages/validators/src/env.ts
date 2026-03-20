import { createEnv } from '@life-as-code/lib/create-env'
import * as z from 'zod/mini'

export const env = createEnv({
  shared: {},

  server: {
    NODE_ENV: z._default(
      z.enum(['development', 'production', 'test']),
      'development',
    ),
    DATABASE_URL: z.string(),
    AUTH_SECRET: z.optional(z.string()),
    AUTH_DISCORD_ID: z.optional(z.string()),
    AUTH_DISCORD_SECRET: z.optional(z.string()),

    // Vercel environment variables
    VERCEL: z.optional(z.string()),
    VERCEL_ENV: z.optional(z.enum(['production', 'preview', 'development'])),
    VERCEL_URL: z.optional(z.string()),
    VERCEL_PROJECT_PRODUCTION_URL: z.optional(z.string()),
  },

  clientPrefix: 'PUBLIC_',
  client: {},

  runtimeEnv: process.env,

  emptyStringAsUndefined: true,
  skipValidation:
    !!process.env.SKIP_ENV_VALIDATION ||
    !!process.env.CI ||
    process.env.npm_lifecycle_event === 'lint',
})
