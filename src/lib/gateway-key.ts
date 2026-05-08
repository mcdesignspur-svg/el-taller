import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'

/**
 * Looks up the MC Designs AI Gateway bearer token provisioned for a given
 * El Taller tenant. Populated post-onboarding (see migration 0003).
 *
 * Returns null when:
 *  - the client row doesn't exist
 *  - the column is empty (tenant not yet provisioned in the Gateway)
 *
 * Callers should fall back to the legacy direct-Anthropic path on null.
 */
export async function getGatewayKeyForClient(
  clientId: string,
): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('clients')
    .select('gateway_api_key')
    .eq('id', clientId)
    .maybeSingle()
  if (error) {
    console.error('[gateway-key] lookup failed:', error.message)
    return null
  }
  return data?.gateway_api_key ?? null
}
