import Link from 'next/link'
import { getCurrentProfile } from '@/lib/dal'
import { createServerClient } from '@/lib/supabase/server'
import type { ContentItem } from '@/lib/types'
import { CalendarRow } from './calendar-row'

export const dynamic = 'force-dynamic'

type Row = Pick<
  ContentItem,
  'id' | 'scheduled_date' | 'type' | 'idea' | 'output' | 'status'
>

export default async function CalendarPage() {
  await getCurrentProfile()

  const supabase = await createServerClient()
  const { data: items, error } = await supabase
    .from('content_items')
    .select('id, scheduled_date, type, idea, output, status')
    .order('scheduled_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="max-w-3xl mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-4">Calendario</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error cargando contenido: {error.message}
        </div>
      </main>
    )
  }

  const grouped = groupByMonth((items as Row[]) ?? [])

  return (
    <main className="max-w-3xl mx-auto p-8">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-semibold">Calendario</h1>
        <Link
          href="/studio"
          className="text-sm rounded-lg bg-zinc-900 text-white px-4 py-2 font-medium hover:bg-zinc-800"
        >
          Crear contenido
        </Link>
      </div>

      {grouped.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {grouped.map(({ label, rows }) => (
            <section key={label}>
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                {label}
              </h2>
              <div className="space-y-2">
                {rows.map((item) => (
                  <CalendarRow key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}

function EmptyState() {
  return (
    <div className="rounded-lg border-2 border-dashed border-zinc-200 px-6 py-16 text-center">
      <p className="text-zinc-700 font-medium mb-1">Todavía no hay contenido</p>
      <p className="text-sm text-zinc-500 mb-6">
        Genera tu primer Reel, Carrusel o Static.
      </p>
      <Link
        href="/studio"
        className="inline-flex rounded-lg bg-zinc-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-800"
      >
        Empezar
      </Link>
    </div>
  )
}

function groupByMonth(rows: Row[]): Array<{ label: string; rows: Row[] }> {
  const groups = new Map<string, Row[]>()
  for (const row of rows) {
    const [y, m] = row.scheduled_date.split('-').map(Number)
    const key = `${y}-${String(m).padStart(2, '0')}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }
  return Array.from(groups.entries()).map(([key, rows]) => {
    const [y, m] = key.split('-').map(Number)
    const date = new Date(y, m - 1, 1)
    const label = date.toLocaleDateString('es-PR', {
      month: 'long',
      year: 'numeric',
    })
    return { label: capitalize(label), rows }
  })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
