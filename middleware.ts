import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl
  
  // Handle legacy products-detail.html redirect
  if (url.pathname === '/products-detail.html' || url.pathname === '/products-detail') {
    const id = url.searchParams.get('id')
    if (id) {
      return NextResponse.redirect(new URL(`/products/${id}`, request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
