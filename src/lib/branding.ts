import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Extract a hex color from arbitrary text. Accepts "#RRGGBB", "#RGB", and
 * common patterns like "terracotta / #B45A3C". Returns the normalized
 * 6-digit lowercase hex or null when no valid color is found.
 *
 * Used to pull a CSS-applicable color out of the brand brief's free-form
 * primary_color/secondary_color fields (which double as AI brief context
 * — those keep the descriptive name; this just extracts the hex part).
 */
export function extractHexColor(input: string | null | undefined): string | null {
  if (!input) return null
  const m = input.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/)
  if (!m) return null
  let hex = m[1].toLowerCase()
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('')
  }
  return `#${hex}`
}

/**
 * Generate a 1-hour signed URL for a logo stored in the content-photos
 * bucket at the given path. Returns null when path is missing or the
 * storage call fails. Caller is responsible for caching the URL within
 * a render (e.g., via React `cache`) to avoid duplicate calls.
 */
export async function getLogoSignedUrl(
  supabase: SupabaseClient,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null
  const { data, error } = await supabase.storage
    .from('content-photos')
    .createSignedUrl(path, 60 * 60)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
