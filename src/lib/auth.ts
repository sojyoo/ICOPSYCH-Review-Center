import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Simple hardcoded authentication for demo
        if (credentials.email === 'admin@reviewcenter.com' && credentials.password === 'password123') {
          return {
            id: '1',
            email: 'admin@reviewcenter.com',
            name: 'Admin User',
            role: 'admin'
          }
        }

        if (credentials.email === 'student@reviewcenter.com' && credentials.password === 'password123') {
          return {
            id: '2',
            email: 'student@reviewcenter.com',
            name: 'Student User',
            role: 'student'
          }
        }

        return null
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}
