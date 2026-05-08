'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getCurrentProfile } from '@/lib/dal'
import { getActiveSupabase } from '@/lib/supabase/server'

const Schema = z.object({
  products: z.string().optional(),
  audience: z.string().optional(),
  voice: z.string().optional(),
  sample_captions: z.string().optional(),
  default_hashtags: z.string().optional(),
  manychat_keywords: z.string().optional(),
  visual_style: z.string().optional(),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  do_dont: z.string().optional(),
  location: z.string().optional(),
  remove_logo: z.string().optional(),
})

export type BrandFormState =
  | { status: 'idle' }
  | { status: 'saved' }
  | { status: 'error'; message: string }

const ALLOWED_LOGO_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
])
const MAX_LOGO_BYTES = 2 * 1024 * 1024 // 2MB

export async function saveBrandBrief(
  _prev: BrandFormState | undefined,
  formData: FormData,
): Promise<BrandFormState> {
  const { profile } = await getCurrentProfile()

  const raw: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') raw[key] = value
  }

  const parsed = Schema.safeParse(raw)
  if (!parsed.success) {
    return { status: 'error', message: 'Datos inválidos' }
  }

  const supabase = await getActiveSupabase(profile)

  // Normalize empty strings to null so isBriefMeaningful logic works.
  const { remove_logo, ...textFields } = parsed.data
  const payload: Record<string, string | null> = Object.fromEntries(
    Object.entries(textFields).map(([k, v]) => [k, v?.trim() || null]),
  )

  // ── Logo handling ──────────────────────────────────────────────────────────
  // Either: upload a new logo, remove the existing one, or leave untouched.
  const logoFile = formData.get('logo')
  if (logoFile instanceof File && logoFile.size > 0) {
    if (!ALLOWED_LOGO_TYPES.has(logoFile.type)) {
      return {
        status: 'error',
        message: 'Logo debe ser PNG, JPG, WebP o SVG',
      }
    }
    if (logoFile.size > MAX_LOGO_BYTES) {
      return { status: 'error', message: 'Logo debe pesar menos de 2MB' }
    }
    const ext =
      logoFile.type === 'image/svg+xml'
        ? 'svg'
        : (logoFile.type.split('/')[1] ?? 'png')
    const path = `${profile.client_id}/branding/logo.${ext}`
    const buffer = Buffer.from(await logoFile.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from('content-photos')
      .upload(path, buffer, {
        contentType: logoFile.type,
        upsert: true,
      })
    if (uploadError) {
      return { status: 'error', message: `Logo upload: ${uploadError.message}` }
    }
    payload.logo_url = path
  } else if (remove_logo === '1') {
    // Best-effort: remove from storage (we don't error out if not found).
    const { data: existing } = await supabase
      .from('brand_briefs')
      .select('logo_url')
      .eq('client_id', profile.client_id)
      .maybeSingle()
    if (existing?.logo_url) {
      await supabase.storage.from('content-photos').remove([existing.logo_url])
    }
    payload.logo_url = null
  }

  // Ensure a brand_briefs row exists for this tenant. RLS-permissive in
  // normal use because the row is created on tenant onboarding; for super
  // admin impersonation we use service-role and explicit client_id filter.
  const { error } = await supabase
    .from('brand_briefs')
    .upsert(
      { client_id: profile.client_id, ...payload, updated_at: new Date().toISOString() },
      { onConflict: 'client_id' },
    )

  if (error) return { status: 'error', message: error.message }

  revalidatePath('/brand')
  revalidatePath('/studio')
  revalidatePath('/calendar')
  return { status: 'saved' }
}
