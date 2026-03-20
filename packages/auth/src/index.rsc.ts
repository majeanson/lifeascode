import NextAuth, { type NextAuthResult } from 'next-auth'
import { cache } from 'react'

import { authOptions } from './config'

const result: NextAuthResult = NextAuth(authOptions)

export const signIn: NextAuthResult['signIn'] = result.signIn
export const signOut: NextAuthResult['signOut'] = result.signOut
export const handlers: NextAuthResult['handlers'] = result.handlers
export const auth: NextAuthResult['auth'] = cache(result.auth)
export { validateSessionToken, invalidateSessionToken } from './config'
