'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/dal'
import type { ContentStatus } from '@/lib/types'

export async function deleteItem(id: string) {
  await getCurrentProfile()
  const supabase = await createServerClient()
  const { error } = await supabase.from('content_items').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/calendar')
  return { ok: true }
}

export async function setItemStatus(id: string, status: ContentStatus) {
  await getCurrentProfile()
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('content_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/calendar')
  return { ok: true }
}
