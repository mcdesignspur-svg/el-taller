import { headers } from 'next/headers'
import { CheckCircle2 } from 'lucide-react'
import { getCurrentProfile } from '@/lib/dal'
import { getActiveSupabase } from '@/lib/supabase/server'
import { getBrandBrief, isBriefMeaningful } from '@/lib/brand-brief'
import { getTenantById, getTenantBySlug, resolveSlugFromHost } from '@/lib/tenant'
import { getLogoSignedUrl } from '@/lib/branding'
import type { BrandBrief } from '@/lib/types'
import { BrandForm } from './brand-form'

// Fields that count toward brief completeness. Sample captions + voice + audience
// + products are weighted because they're the ones that actually shape the AI
// output — the rest are nice-to-have.
const BRIEF_FIELDS: Array<{ key: keyof BrandBrief; weight: number }> = [
  { key: 'products', weight: 2 },
  { key: 'audience', weight: 2 },
  { key: 'voice', weight: 2 },
  { key: 'sample_captions', weight: 2 },
  { key: 'location', weight: 1 },
  { key: 'visual_style', weight: 1 },
  { key: 'primary_color', weight: 1 },
  { key: 'secondary_color', weight: 1 },
  { key: 'default_hashtags', weight: 1 },
  { key: 'manychat_keywords', weight: 1 },
  { key: 'do_dont', weight: 1 },
]

function computeProgress(
  brief: Partial<BrandBrief>,
  hasLogo: boolean,
): { filled: number; total: number; percent: number } {
  const totalWeight =
    BRIEF_FIELDS.reduce((sum, f) => sum + f.weight, 0) + 1 // +1 for logo
  const filledWeight =
    BRIEF_FIELDS.reduce((sum, f) => {
      const val = brief[f.key]
      const isFilled = typeof val === 'string' && val.trim().length > 0
      return sum + (isFilled ? f.weight : 0)
    }, 0) + (hasLogo ? 1 : 0)
  return {
    filled: filledWeight,
    total: totalWeight,
    percent: Math.round((filledWeight / totalWeight) * 100),
  }
}

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ welcome?: string }>

export default async function BrandPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { profile } = await getCurrentProfile()
  const supabase = await getActiveSupabase(profile)
  const brief = (await getBrandBrief(supabase, profile.client_id)) ?? ({} as Partial<BrandBrief>)
  const logoUrl = await getLogoSignedUrl(supabase, brief.logo_url ?? null)

  const h = await headers()
  const tenant = profile.is_synthetic
    ? await getTenantById(profile.client_id)
    : await (async () => {
        const slug = h.get('x-tenant-slug') ?? resolveSlugFromHost(h.get('host'))
        return slug ? await getTenantBySlug(slug) : null
      })()

  const params = await searchParams
  const isWelcome = params.welcome === '1'

  const progress = computeProgress(brief, Boolean(logoUrl))
  const meaningful = isBriefMeaningful(brief as BrandBrief)

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

      {/* Progress card — shows completeness so the user knows when the brief
          is rich enough for the AI to sound on-brand. */}
      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            {meaningful && (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            )}
            <p className="text-sm font-medium text-zinc-900">
              {meaningful
                ? 'Listo para generar en tu voz'
                : progress.percent === 0
                  ? 'Empecemos por lo básico'
                  : 'Sigue llenando — vas bien'}
            </p>
          </div>
          <span className="text-xs font-medium text-zinc-500 tabular-nums shrink-0">
            {progress.percent}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              meaningful ? 'bg-emerald-500' : 'bg-zinc-900'
            }`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          {meaningful
            ? 'Puedes seguir afinando — los campos opcionales (hashtags, ManyChat, evitar) hacen el output más preciso.'
            : 'Llena al menos qué vendes, a quién y cómo le hablas para que la AI suene como tú.'}
        </p>
      </div>

      <BrandForm brief={brief} logoUrl={logoUrl} />
    </main>
  )
}
