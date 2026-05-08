'use server'

import { revalidatePath } from 'next/cache'
import { getActiveSupabase } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/dal'
import type { ContentOutput, ContentStatus } from '@/lib/types'

export async function deleteItem(id: string) {
  const { profile } = await getCurrentProfile()
  const supabase = await getActiveSupabase(profile)
  const { error } = await supabase
    .from('content_items')
    .delete()
    .eq('id', id)
    .eq('client_id', profile.client_id)
  if (error) return { error: error.message }
  revalidatePath('/calendar')
  return { ok: true }
}

export async function setItemStatus(id: string, status: ContentStatus) {
  const { profile } = await getCurrentProfile()
  const supabase = await getActiveSupabase(profile)
  const { error } = await supabase
    .from('content_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('client_id', profile.client_id)
  if (error) return { error: error.message }
  revalidatePath('/calendar')
  return { ok: true }
}

export async function updateItemOutput(id: string, output: ContentOutput) {
  const { profile } = await getCurrentProfile()
  const supabase = await getActiveSupabase(profile)
  const { error } = await supabase
    .from('content_items')
    .update({ output, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('client_id', profile.client_id)
  if (error) return { error: error.message }
  revalidatePath('/calendar')
  return { ok: true }
}
