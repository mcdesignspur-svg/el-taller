'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
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

// ---- Crear tenant + usuario --------------------------------------------------

export type CreateTenantUserState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; tenantName: string; tenantSlug: string; email: string }

const CreateSchema = z.object({
  tenantName: z.string().trim().min(2, 'Nombre del cliente muy corto'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Slug solo letras, números y guiones')
    .min(2, 'Slug muy corto')
    .optional()
    .or(z.literal('')),
  email: z.email({ error: 'Email inválido' }).trim().toLowerCase(),
  password: z.string().min(8, 'Contraseña mínima 8 caracteres'),
})

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 40)
}

/**
 * Provision a brand-new tenant and its owner user in one shot. Caller must be
 * a super admin. Steps:
 *   1. Insert clients row (slug auto-derived from name if not provided).
 *   2. Create auth.users with email_confirm and user_metadata.client_id set —
 *      so any future login flow binds to the right tenant even from the wrong
 *      host.
 *   3. Insert the profile row as 'owner' so the user can log in directly
 *      without going through the bootstrap path in login/actions.ts.
 *
 * Cleans up the tenant row if user creation fails so we don't leave orphans.
 */
export async function createTenantAndUser(
  _prev: CreateTenantUserState | undefined,
  formData: FormData,
): Promise<CreateTenantUserState> {
  const { profile } = await getCurrentProfile()
  if (!profile.is_super_admin) {
    return { status: 'error', message: 'Solo super admins' }
  }

  const parsed = CreateSchema.safeParse({
    tenantName: formData.get('tenantName'),
    slug: formData.get('slug'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
    }
  }

  const { tenantName, email, password } = parsed.data
  const slug = parsed.data.slug && parsed.data.slug.length > 0
    ? parsed.data.slug
    : slugify(tenantName)

  if (!slug || slug.length < 2) {
    return { status: 'error', message: 'No pude derivar un slug válido' }
  }

  const admin = createAdminClient()

  const { data: dupSlug } = await admin
    .from('clients')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (dupSlug) {
    return { status: 'error', message: `Slug "${slug}" ya existe` }
  }

  const { data: tenant, error: tenantErr } = await admin
    .from('clients')
    .insert({ slug, name: tenantName, plan_tier: 'beta', is_active: true })
    .select('id, slug, name')
    .single()
  if (tenantErr || !tenant) {
    return { status: 'error', message: tenantErr?.message ?? 'Error creando tenant' }
  }

  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { client_id: tenant.id },
  })
  if (userErr || !created.user) {
    await admin.from('clients').delete().eq('id', tenant.id)
    const msg = userErr?.message ?? 'Error creando usuario'
    return {
      status: 'error',
      message: msg.includes('already')
        ? 'Ese email ya tiene un usuario en Supabase'
        : msg,
    }
  }

  const { error: profileErr } = await admin.from('profiles').insert({
    id: created.user.id,
    client_id: tenant.id,
    role: 'owner',
    email,
  })
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id)
    await admin.from('clients').delete().eq('id', tenant.id)
    return { status: 'error', message: profileErr.message }
  }

  revalidatePath('/admin')
  return {
    status: 'success',
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    email,
  }
}
