import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

export type ProfileRole = 'owner' | 'editor' | 'viewer' | 'super_admin'

export type Profile = {
  id: string
  client_id: string
  role: ProfileRole
  email: string | null
  full_name: string | null
  is_super_admin: boolean
  /**
   * True when this profile is synthesized for a super admin acting on a
   * tenant they don't own (no real profile row exists for that tenant).
   * Callers should use a service-role client for tenant-scoped queries
   * because RLS would otherwise scope to the user's primary tenant.
   */
  is_synthetic: boolean
}

export const ACTING_AS_COOKIE = 'el_taller_acting_as'

/**
 * Read the current Supabase user from the request cookies.
 * Returns null if not signed in. Memoized per render via React `cache`.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
})

/**
 * Hard auth gate: redirects to /login if no session.
 */
export const verifySession = cache(async (): Promise<User> => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
})

/**
 * Returns the current user plus their *active* profile. The active profile is:
 *  - their real profile, OR
 *  - a synthetic super-admin profile for the tenant they're impersonating
 *    (set via /admin → cookie ACTING_AS_COOKIE).
 *
 * Most callers can use `profile.client_id` directly — it always points to the
 * tenant whose data should be shown for this request. Use `getActiveSupabase`
 * for tenant-scoped queries to honor synthetic profiles correctly.
 */
export const getCurrentProfile = cache(
  async (): Promise<{ user: User; profile: Profile }> => {
    const user = await verifySession()
    const supabase = await createServerClient()
    const { data: real, error } = await supabase
      .from('profiles')
      .select('id, client_id, role, email, full_name, is_super_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (error || !real) redirect('/login?error=no_profile')

    const realProfile: Profile = {
      ...real,
      role: real.role as ProfileRole,
      is_synthetic: false,
    }

    // Honor impersonation cookie only if user is a super admin.
    if (!realProfile.is_super_admin) return { user, profile: realProfile }

    const cookieStore = await cookies()
    const actingAs = cookieStore.get(ACTING_AS_COOKIE)?.value
    if (!actingAs || actingAs === realProfile.client_id) {
      return { user, profile: realProfile }
    }

    // Validate target tenant exists. Use service-role since super admin
    // doesn't have a profile row for the target.
    const admin = createAdminClient()
    const { data: target } = await admin
      .from('clients')
      .select('id')
      .eq('id', actingAs)
      .maybeSingle()
    if (!target) {
      // Stale/invalid cookie — fall back to real profile.
      return { user, profile: realProfile }
    }

    const synthetic: Profile = {
      id: realProfile.id,
      client_id: actingAs,
      role: 'super_admin',
      email: realProfile.email,
      full_name: realProfile.full_name,
      is_super_admin: true,
      is_synthetic: true,
    }
    return { user, profile: synthetic }
  },
)
