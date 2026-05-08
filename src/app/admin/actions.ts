'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ACTING_AS_COOKIE, getCurrentProfile } from '@/lib/dal'
import { createAdminClient } from '@/lib/supabase/server'

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: true,
  path: '/',
  maxAge: 60 * 60 * 8, // 8h — auto-expires so admin doesn't stay impersonating
}

/**
 * Enter the studio as the given tenant. Caller must be a super admin.
 * Sets the ACTING_AS cookie and redirects into /studio. Throws on
 * validation failure (caught by the form boundary).
 */
export async function enterAsTenant(formData: FormData): Promise<void> {
  const clientId = String(formData.get('client_id') ?? '')
  if (!clientId) throw new Error('client_id required')

  const { profile } = await getCurrentProfile()
  if (!profile.is_super_admin) {
    throw new Error('Solo super admins pueden impersonar tenants')
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('clients')
    .select('id, slug, name')
    .eq('id', clientId)
    .maybeSingle()
  if (error || !data) throw new Error('Tenant no existe')

  const cookieStore = await cookies()
  cookieStore.set(ACTING_AS_COOKIE, clientId, COOKIE_OPTIONS)
  revalidatePath('/', 'layout')
  redirect('/studio')
}

/**
 * Exit impersonation: clear the cookie and bounce back to /admin.
 */
export async function exitImpersonation() {
  const cookieStore = await cookies()
  cookieStore.delete(ACTING_AS_COOKIE)
  revalidatePath('/', 'layout')
  redirect('/admin')
}
