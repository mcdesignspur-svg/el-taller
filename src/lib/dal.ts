import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'

export type Profile = {
  id: string
  client_id: string
  role: 'owner' | 'editor' | 'viewer'
  email: string | null
  full_name: string | null
}

/**
 * Read the current Supabase user from the request cookies.
 * Returns null if not signed in. Memoized per render via React `cache`.
 *
 * Use `verifySession()` instead when a route MUST be authenticated —
 * that helper redirects to /login on miss.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
})

/**
 * Hard auth gate: redirects to /login if no session. Use at the top of
 * any layout or page that requires a signed-in user.
 */
export const verifySession = cache(async (): Promise<User> => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
})

/**
 * Returns the current user plus their profile row (which carries the
 * tenant binding). Redirects to /login if the user has no profile —
 * that means they signed up but never went through the callback's
 * profile-creation step, which should not happen in normal flow.
 */
export const getCurrentProfile = cache(
  async (): Promise<{ user: User; profile: Profile }> => {
    const user = await verifySession()
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, client_id, role, email, full_name')
      .eq('id', user.id)
      .maybeSingle()

    if (error || !data) redirect('/login?error=no_profile')
    return { user, profile: data as Profile }
  },
)
