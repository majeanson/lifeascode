import '@life-as-code/validators/env.next'
import '@life-as-code/validators/env'

import type { NextConfig } from 'next'

const nextConfig = {
  typedRoutes: true,
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  experimental: {
    cpus: 1,
  },

  transpilePackages: [
    '@life-as-code/api',
    '@life-as-code/db',
    '@life-as-code/lib',
    '@life-as-code/ui',
    '@life-as-code/validators',
  ],
} satisfies NextConfig

export default nextConfig
