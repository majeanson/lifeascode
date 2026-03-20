import NextAuth, { type NextAuthResult } from 'next-auth'

import { authOptions } from './config'

const result: NextAuthResult = NextAuth(authOptions)

export const auth: NextAuthResult['auth'] = result.auth
export const signIn: NextAuthResult['signIn'] = result.signIn
export const signOut: NextAuthResult['signOut'] = result.signOut
export const handlers: NextAuthResult['handlers'] = result.handlers
export { validateSessionToken, invalidateSessionToken } from './config'
