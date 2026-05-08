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
  // Same logic as /auth/callback for the magic-link flow.
  const h = await headers()
  const slug = resolveSlugFromHost(h.get('host'))
  if (slug) {
    const admin = createAdminClient()
    const { data: tenant } = await admin
      .from('clients')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (tenant) {
      const { data: existing } = await admin
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!existing) {
        await admin.from('profiles').insert({
          id: data.user.id,
          client_id: tenant.id,
          role: 'owner',
          email: data.user.email,
        })
      }
    }
  }

  redirect('/studio')
}
