import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
      cohort: string
      studentNumber?: string
    }
  }

  interface User {
    id: string
    name: string
    email: string
    role: string
    cohort: string
    studentNumber?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    cohort: string
    studentNumber?: string
  }
}



