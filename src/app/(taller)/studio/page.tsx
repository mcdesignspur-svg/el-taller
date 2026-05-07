import Link from 'next/link'
import { getCurrentProfile } from '@/lib/dal'
import { createServerClient } from '@/lib/supabase/server'
import { getBrandBrief, isBriefMeaningful } from '@/lib/brand-brief'
import { StudioForm } from './studio-form'

export const dynamic = 'force-dynamic'

export default async function StudioPage() {
  const { profile } = await getCurrentProfile()
  const supabase = await createServerClient()
  const brief = await getBrandBrief(supabase, profile.client_id)
  const showBriefBanner = !isBriefMeaningful(brief)

  return (
    <main className="min-h-[calc(100vh-65px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl space-y-4">
        {showBriefBanner && (
          <Link
            href="/brand"
            className="block rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100 transition"
          >
            <span className="font-medium">Llena tu brand brief</span> para que la AI
            genere contenido en tu voz, no genérico. →
          </Link>
        )}
        <StudioForm />
      </div>
    </main>
  )
}
