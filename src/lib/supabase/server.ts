import 'server-only'

import { cookies } from 'next/headers'
import { createServerClient as createSSRClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * Anon-key Supabase client bound to the request cookies.
 * Use this in Server Components, Route Handlers, and Server Actions
 * when you want RLS to apply on behalf of the signed-in user.
 */
export async function createServerClient() {
  const cookieStore = await cookies()

  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing user sessions.
          }
        },
      },
    },
  )
}

/**
 * Service-role client. BYPASSES RLS — only use in trusted server code
 * (admin actions, webhooks, system jobs, usage_logs writes).
 * NEVER expose this to the browser.
 */
export function createAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
