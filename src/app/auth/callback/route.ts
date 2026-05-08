import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { resolveSlugFromHost } from '@/lib/tenant'

// GET /auth/callback?code=...
//
// Magic-link flow:
//   1. Supabase emails the user a link to /auth/callback?code=...
//   2. We exchange the code for a session (cookies are written by SSR client).
//   3. On first sign-in, we create a profile row binding the user to the
//      tenant inferred from the host. Subsequent sign-ins skip this.
//   4. Redirect into the studio.

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/studio'
  const origin = url.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
  }

  const admin = createAdminClient()

  // Same bootstrap flow as src/app/login/actions.ts: prefer user_metadata's
  // client_id, fall back to the URL host. Skip when the profile already
  // exists (e.g., password-reset coming back through this callback).
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!existing) {
    const metaClientId =
      (data.user.user_metadata as { client_id?: string } | null)?.client_id ?? null

    let clientId: string | null = null
    if (metaClientId) {
      const { data: tenant } = await admin
        .from('clients')
        .select('id')
        .eq('id', metaClientId)
        .maybeSingle()
      if (tenant) clientId = tenant.id
    }

    if (!clientId) {
      const slug = resolveSlugFromHost(request.headers.get('host'))
      if (!slug) {
        return NextResponse.redirect(`${origin}/login?error=no_tenant`)
      }
      const { data: tenant } = await admin
        .from('clients')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (!tenant) {
        return NextResponse.redirect(`${origin}/login?error=tenant_not_found`)
      }
      clientId = tenant.id
    }

    await admin.from('profiles').insert({
      id: data.user.id,
      client_id: clientId,
      // First user on a tenant is the owner. Phase 4 introduces invitations
      // and granular role assignment.
      role: 'owner',
      email: data.user.email,
    })
  }

  return NextResponse.redirect(`${origin}${next}`)
}
