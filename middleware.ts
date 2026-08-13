import { NextResponse, type NextRequest } from 'next/server'
import { isSuppressedPublicAuthorSlug } from '@/lib/catalog/public-author-identity'

export function middleware(request: NextRequest) {
  const authorProfileMatch = request.nextUrl.pathname.match(/^\/authors\/([^/]+)\/?$/)

  if (authorProfileMatch && isSuppressedPublicAuthorSlug(authorProfileMatch[1])) {
    return NextResponse.redirect(new URL('/authors', request.url), 307)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/authors/:slug*'],
}
