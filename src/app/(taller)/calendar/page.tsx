import Link from 'next/link'
import { getCurrentProfile } from '@/lib/dal'
import { createServerClient } from '@/lib/supabase/server'
import type { ContentItem } from '@/lib/types'
import { ListView } from './list-view'
import { MonthView } from './month-view'

export const dynamic = 'force-dynamic'

type Row = Pick<
  ContentItem,
  'id' | 'scheduled_date' | 'type' | 'idea' | 'output' | 'status'
>

type SearchParams = Promise<{ view?: string; month?: string }>

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await getCurrentProfile()

  const params = await searchParams
  const view: 'list' | 'month' = params.view === 'month' ? 'month' : 'list'
  const monthParam = params.month ?? currentMonthKey()

  const supabase = await createServerClient()
  const query = supabase
    .from('content_items')
    .select('id, scheduled_date, type, idea, output, status')

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

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error cargando contenido: {error.message}
        </div>
      ) : view === 'month' ? (
        <MonthView monthKey={monthParam} items={(data as Row[]) ?? []} />
      ) : (
        <ListView items={(data as Row[]) ?? []} />
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

function isoDate(y: number, mIndex: number, d: number): string {
  // Construct YYYY-MM-DD from year + 0-indexed month + day, accepting day=0 to
  // mean last day of previous month.
  const date = new Date(y, mIndex, d)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
