'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { resolveSlugFromHost } from '@/lib/tenant'

const Schema = z.object({
  email: z.email({ error: 'Email inválido' }).trim().toLowerCase(),
  password: z.string().min(1, 'Escribe tu contraseña'),
})

export type LoginState =
  | { status: 'idle' }
  | { status: 'error'; message: string }

export async function signIn(
  _prev: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const parsed = Schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Datos inválidos',
    }
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user) {
    // Generic message — don't leak whether the email exists.
    return { status: 'error', message: 'Email o contraseña incorrectos' }
  }

  // Bootstrap the profile on first sign-in — passwords are set in the Supabase
  // dashboard, so the auth.users row may exist without a matching profile yet.
  //
  // Resolution order for the client_id:
  //   1. user_metadata.client_id — set by Miguel on the auth user (preferred,
  //      works regardless of which domain the user enters from).
  //   2. host-derived slug — fallback for tenants whose users always log in
  //      from their own subdomain. Wrong-domain logins can mis-bootstrap, so
  //      metadata is the safer path.
  const admin = createAdminClient()
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
      const h = await headers()
      const slug = resolveSlugFromHost(h.get('host'))
      if (slug) {
        const { data: tenant } = await admin
          .from('clients')
          .select('id')
          .eq('slug', slug)
          .maybeSingle()
        if (tenant) clientId = tenant.id
      }
    }

    if (clientId) {
      await admin.from('profiles').insert({
        id: data.user.id,
        client_id: clientId,
        role: 'owner',
        email: data.user.email,
      })
    }
  }

  redirect('/studio')
}
