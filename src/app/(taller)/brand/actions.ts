'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getCurrentProfile } from '@/lib/dal'
import { createServerClient } from '@/lib/supabase/server'

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
})

export type BrandFormState =
  | { status: 'idle' }
  | { status: 'saved' }
  | { status: 'error'; message: string }

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

  const supabase = await createServerClient()

  // Normalize empty strings to null so isBriefMeaningful logic works.
  const payload = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v?.trim() || null]),
  )

  const { error } = await supabase
    .from('brand_briefs')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('client_id', profile.client_id)

  if (error) return { status: 'error', message: error.message }

  revalidatePath('/brand')
  revalidatePath('/studio')
  return { status: 'saved' }
}
