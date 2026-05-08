import { headers } from 'next/headers'
import { getCurrentProfile } from '@/lib/dal'
import { createServerClient } from '@/lib/supabase/server'
import { getBrandBrief } from '@/lib/brand-brief'
import { getTenantBySlug, resolveSlugFromHost } from '@/lib/tenant'
import { getLogoSignedUrl } from '@/lib/branding'
import type { BrandBrief } from '@/lib/types'
import { BrandForm } from './brand-form'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ welcome?: string }>

export default async function BrandPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { profile } = await getCurrentProfile()
  const supabase = await createServerClient()
  const brief = (await getBrandBrief(supabase, profile.client_id)) ?? ({} as Partial<BrandBrief>)
  const logoUrl = await getLogoSignedUrl(supabase, brief.logo_url ?? null)

  const h = await headers()
  const slug = h.get('x-tenant-slug') ?? resolveSlugFromHost(h.get('host'))
  const tenant = slug ? await getTenantBySlug(slug) : null

  const params = await searchParams
  const isWelcome = params.welcome === '1'

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      {isWelcome && (
        <div className="mb-8 rounded-xl border border-zinc-900 bg-zinc-900 text-white px-5 py-4">
          <p className="text-xs uppercase tracking-widest text-zinc-400 mb-1">
            Bienvenido a El Taller
          </p>
          <p className="text-base font-medium mb-1">
            Empieza llenando este brand brief.
          </p>
          <p className="text-sm text-zinc-300">
            Es lo que separa contenido genérico de contenido que suena exactamente como{' '}
            {tenant?.name ?? 'tu negocio'}. Toma 5 minutos. Después puedes editar
            cuando quieras.
          </p>
        </div>
      )}
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
      <BrandForm brief={brief} logoUrl={logoUrl} />
    </main>
  )
}
