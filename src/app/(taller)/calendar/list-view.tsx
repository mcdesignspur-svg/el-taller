import Link from 'next/link'
import type { ContentItem } from '@/lib/types'
import { CalendarRow } from './calendar-row'

type Row = Pick<
  ContentItem,
  'id' | 'scheduled_date' | 'type' | 'idea' | 'output' | 'status' | 'photo_url'
>

export function ListView({ items }: { items: Row[] }) {
  if (items.length === 0) {
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

  const grouped = groupByMonth(items)

  return (
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
