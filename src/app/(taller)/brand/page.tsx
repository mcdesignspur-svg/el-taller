import { headers } from 'next/headers'
import { getCurrentProfile } from '@/lib/dal'
import { createServerClient } from '@/lib/supabase/server'
import { getBrandBrief } from '@/lib/brand-brief'
import { getTenantBySlug, resolveSlugFromHost } from '@/lib/tenant'
import type { BrandBrief } from '@/lib/types'
import { BrandForm } from './brand-form'

export const dynamic = 'force-dynamic'

export default async function BrandPage() {
  const { profile } = await getCurrentProfile()
  const supabase = await createServerClient()
  const brief = (await getBrandBrief(supabase, profile.client_id)) ?? ({} as Partial<BrandBrief>)

  const h = await headers()
  const slug = h.get('x-tenant-slug') ?? resolveSlugFromHost(h.get('host'))
  const tenant = slug ? await getTenantBySlug(slug) : null

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">Brand brief</h1>
        <p className="text-sm text-zinc-500">
          La AI usa este contexto para generar contenido en la voz de{' '}
          <span className="font-medium text-zinc-700">
            {tenant?.name ?? 'tu negocio'}
          </span>
          . Mientras más detalle, más preciso el output.
        </p>
      </div>
      <BrandForm brief={brief} />
    </main>
  )
}
