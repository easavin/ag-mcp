import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import type { NextAuthOptions } from 'next-auth'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user) {
          return null
        }

        // Validate password (prefer hashed; auto-migrate plaintext to hashed for legacy rows)
        if (!user.password) {
          // No stored password — do not allow fallback passwords in any environment
          return null
        }

        let isPasswordValid = false
        const storedPassword = user.password

        // Detect bcrypt hash format
        const looksHashed = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')

        if (looksHashed) {
          isPasswordValid = await bcrypt.compare(credentials.password, storedPassword)
        } else {
          // Legacy plaintext password support: compare directly, then upgrade to bcrypt
          if (credentials.password === storedPassword) {
            isPasswordValid = true
            try {
              const newHash = await bcrypt.hash(credentials.password, 10)
              await prisma.user.update({
                where: { id: user.id },
                data: { password: newHash },
              })
            } catch (e) {
              // If hashing or update fails, still allow this login but keep plaintext (avoid lockout)
            }
          }
        }

        if (!isPasswordValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/',
  },
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-secret-key' : undefined),
} 