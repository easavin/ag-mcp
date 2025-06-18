import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth-config'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
    }
  }
  interface User {
    id: string
    email: string
    name?: string | null
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST } 