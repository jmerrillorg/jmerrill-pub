import NextAuth from 'next-auth'

import { authorAuthOptions } from '@/lib/server/author-durable-auth'

const handler = NextAuth(authorAuthOptions)

export { handler as GET, handler as POST }
