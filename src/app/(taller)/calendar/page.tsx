import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { getCurrentProfile } from '@/lib/dal'
import { getActiveSupabase } from '@/lib/supabase/server'
import type { ContentItem, ContentStatus, ContentType } from '@/lib/types'
import { ListView } from './list-view'
import { MonthView } from './month-view'

export const dynamic = 'force-dynamic'

type Row = Pick<
  ContentItem,
  'id' | 'scheduled_date' | 'type' | 'idea' | 'output' | 'status' | 'photo_url'
>

type SearchParams = Promise<{ view?: string; month?: string }>

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { profile } = await getCurrentProfile()

  const params = await searchParams
  const view: 'list' | 'month' = params.view === 'month' ? 'month' : 'list'
  const monthParam = params.month ?? currentMonthKey()

  const supabase = await getActiveSupabase(profile)
  // Explicit client_id filter is mandatory: when super admin is impersonating,
  // service-role bypasses RLS, so we scope manually.
  const query = supabase
    .from('content_items')
    .select('id, scheduled_date, type, idea, output, status, photo_url')
    .eq('client_id', profile.client_id)

  if (view === 'month') {
    const [y, m] = monthParam.split('-').map(Number)
    const start = isoDate(y, m - 1, 1)
    const end = isoDate(y, m, 0) // last day of month m (0-indexed +1)
    query.gte('scheduled_date', start).lte('scheduled_date', end)
  } else {
    query
      .order('scheduled_date', { ascending: false })
      .order('created_at', { ascending: false })
  }

  const { data, error } = await query

  // Enrich photo_url paths with 24h signed URLs so the editor can render them.
  const rows = await enrichWithSignedPhotos(supabase, (data as Row[]) ?? [])

  // Today + week highlights — separate small query so it shows regardless of
  // the current view's month filter.
  const today = todayInPR()
  const { weekStart, weekEnd } = weekRange(today)
  const { data: weekData } = await supabase
    .from('content_items')
    .select('id, scheduled_date, type, status')
    .eq('client_id', profile.client_id)
    .gte('scheduled_date', weekStart)
    .lte('scheduled_date', weekEnd)

  const weekItems =
    (weekData as Array<{
      id: string
      scheduled_date: string
      type: ContentType
      status: ContentStatus
    }> | null) ?? []
  const todayCount = weekItems.filter((i) => i.scheduled_date === today).length
  const weekCount = weekItems.length

  return (
    <main className="max-w-5xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Calendario</h1>
        <div className="flex items-center gap-3">
          <ViewToggle active={view} month={monthParam} />
          <Link
            href="/studio"
            className="text-sm rounded-lg bg-zinc-900 text-white px-4 py-2 font-medium hover:bg-zinc-800"
          >
            Crear contenido
          </Link>
        </div>
      </div>

      {weekCount > 0 && (
        <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 flex items-center gap-3 flex-wrap">
          <Sparkles size={16} className="text-zinc-500 shrink-0" />
          <p className="text-sm text-zinc-700 flex-1 min-w-0">
            {todayCount > 0 ? (
              <>
                <span className="font-medium text-zinc-900">
                  Hoy tienes {todayCount} {todayCount === 1 ? 'post' : 'posts'}
                </span>{' '}
                programado{todayCount === 1 ? '' : 's'} —{' '}
                <span className="text-zinc-500">
                  {weekCount} en total esta semana.
                </span>
              </>
            ) : (
              <>
                <span className="font-medium text-zinc-900">
                  {weekCount} {weekCount === 1 ? 'post' : 'posts'} esta semana
                </span>
                <span className="text-zinc-500"> · nada para hoy.</span>
              </>
            )}
          </p>
        </div>
      )}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error cargando contenido: {error.message}
        </div>
      ) : view === 'month' ? (
        <MonthView monthKey={monthParam} items={rows} />
      ) : (
        <ListView items={rows} />
      )}
    </main>
  )
}

function ViewToggle({ active, month }: { active: 'list' | 'month'; month: string }) {
  const baseClass = 'px-3 py-1.5 text-sm rounded-md transition'
  const activeClass = 'bg-white shadow-sm text-zinc-900 font-medium'
  const inactiveClass = 'text-zinc-600 hover:text-zinc-900'

  return (
    <div className="inline-flex rounded-lg bg-zinc-100 p-1">
      <Link
        href={{ pathname: '/calendar', query: { view: 'list' } }}
        className={`${baseClass} ${active === 'list' ? activeClass : inactiveClass}`}
      >
        Lista
      </Link>
      <Link
        href={{ pathname: '/calendar', query: { view: 'month', month } }}
        className={`${baseClass} ${active === 'month' ? activeClass : inactiveClass}`}
      >
        Calendario
      </Link>
    </div>
  )
}

function currentMonthKey(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Puerto_Rico',
    year: 'numeric',
    month: '2-digit',
  })
  return fmt.format(new Date()).slice(0, 7)
}

function todayInPR(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Puerto_Rico',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(new Date())
}

function weekRange(todayIso: string): { weekStart: string; weekEnd: string } {
  // Sunday-anchored week — matches the month-view grid and most PR retail
  // weekly cycles. Build from the ISO date so DST/timezone math doesn't drift.
  const [y, m, d] = todayIso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dow = date.getDay() // 0 = Sun
  const start = new Date(date)
  start.setDate(date.getDate() - dow)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`
  return { weekStart: fmt(start), weekEnd: fmt(end) }
}

function isoDate(y: number, mIndex: number, d: number): string {
  // Construct YYYY-MM-DD from year + 0-indexed month + day, accepting day=0 to
  // mean last day of previous month.
  const date = new Date(y, mIndex, d)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

async function enrichWithSignedPhotos(
  supabase: Awaited<ReturnType<typeof getActiveSupabase>>,
  rows: Row[],
): Promise<Row[]> {
  const paths = rows
    .map((r) => r.photo_url)
    .filter((p): p is string => typeof p === 'string' && p.length > 0)

  if (paths.length === 0) return rows

  const { data: signed } = await supabase.storage
    .from('content-photos')
    .createSignedUrls(paths, 60 * 60 * 24)

  const byPath = new Map<string, string>()
  if (signed) {
    for (const entry of signed) {
      if (entry.path && entry.signedUrl) byPath.set(entry.path, entry.signedUrl)
    }
  }

  return rows.map((r) => ({
    ...r,
    photo_url: r.photo_url ? (byPath.get(r.photo_url) ?? null) : null,
  }))
}
