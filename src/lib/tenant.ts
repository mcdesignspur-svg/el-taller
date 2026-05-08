import { cache } from 'react'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

export type Tenant = {
  id: string
  slug: string
  name: string
  domain: string | null
  plan_tier: string
  is_active: boolean
}

// Hardcoded host → slug map for fast tenant resolution in proxy.
// Extend this when onboarding new tenants. DB-driven resolution can be
// added later if the tenant count outgrows manual maintenance.
export const TENANT_HOSTS: Record<string, string> = {
  'studio.mcdesignspr.com': 'demo',
  'studio.beboutiquepr.com': 'be-boutique',
  'localhost:3000': 'demo',
  'localhost:3001': 'demo',
}

export function resolveSlugFromHost(host: string | null | undefined): string | null {
  if (!host) return null
  const normalized = host.toLowerCase().split(',')[0].trim()
  return TENANT_HOSTS[normalized] ?? null
}

/**
 * Fetch a tenant by slug. Memoized per render via React `cache`.
 * Uses the anon-key client so RLS still applies — but `clients` has a
 * permissive read policy for `current_client_id()` only, so for the
 * marketing/login flow we read with the service-role helper instead.
 */
export const getTenantBySlug = cache(async (slug: string): Promise<Tenant | null> => {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, slug, name, domain, plan_tier, is_active')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null
  return data as Tenant
})

/**
 * Fetch a tenant by id, bypassing RLS. Used when a super admin is acting
 * on a tenant they don't have a profile for (impersonation flow).
 */
export const getTenantById = cache(async (id: string): Promise<Tenant | null> => {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, slug, name, domain, plan_tier, is_active')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return data as Tenant
})

/**
 * List all active tenants. Service-role read — only for admin views.
 */
export async function listAllTenants(): Promise<Tenant[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, slug, name, domain, plan_tier, is_active')
    .eq('is_active', true)
    .order('name')
  if (error || !data) return []
  return data as Tenant[]
}
