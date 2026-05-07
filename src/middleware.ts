import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import { resolveSlugFromHost } from '@/lib/tenant'

// Two responsibilities:
// (1) keep the Supabase auth session fresh,
// (2) attach `x-tenant-slug` to the request so server components can
// scope queries without re-parsing the host on each call.

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  const slug = resolveSlugFromHost(request.headers.get('host'))
  if (slug) {
    response.headers.set('x-tenant-slug', slug)
    request.headers.set('x-tenant-slug', slug)
  }

  return response
}

export const config = {
  matcher: [
    // Skip Next internals, static assets, and image optimisation.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
