import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import { resolveSlugFromHost } from '@/lib/tenant'

// Two responsibilities:
// (1) keep the Supabase auth session fresh,
// (2) attach `x-tenant-slug` to the request so server components can
// scope queries without re-parsing the host on each call.
//
// Wrapped in try/catch so a Supabase / env-var failure can't take the
// entire site down with MIDDLEWARE_INVOCATION_FAILED. Auth pages will
// still work and surface the underlying issue.

export async function middleware(request: NextRequest) {
  let response: NextResponse

  try {
    response = await updateSession(request)
  } catch (err) {
    console.error('[middleware] updateSession failed:', err)
    response = NextResponse.next({ request: { headers: request.headers } })
  }

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
