'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ContentItem, ContentStatus } from '@/lib/types'
import { OutputEditor } from '@/components/output-editor'
import { deleteItem, setItemStatus } from './actions'

type Row = Pick<
  ContentItem,
  'id' | 'scheduled_date' | 'type' | 'idea' | 'output' | 'status'
>

const TYPE_DOT: Record<ContentItem['type'], string> = {
  reel: 'bg-violet-500',
  carousel: 'bg-sky-500',
  static: 'bg-amber-500',
}

const STATUS_BORDER: Record<ContentStatus, string> = {
  draft: 'border-zinc-200',
  approved: 'border-amber-300',
  published: 'border-emerald-300',
}

const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: 'Draft',
  approved: 'Aprobado',
  published: 'Publicado',
}

const STATUS_CHIP: Record<ContentStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-700',
  approved: 'bg-amber-100 text-amber-800',
  published: 'bg-emerald-100 text-emerald-800',
}

const NEXT_STATUS: Record<ContentStatus, ContentStatus | null> = {
  draft: 'approved',
  approved: 'published',
  published: null,
}

const TYPE_LABEL: Record<ContentItem['type'], string> = {
  reel: 'Reel',
  carousel: 'Carrusel',
  static: 'Static',
}

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

type Props = {
  monthKey: string // YYYY-MM
  items: Row[]
}

export function MonthView({ monthKey, items }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  const [year, monthIndex] = useMemo(() => {
    const [y, m] = monthKey.split('-').map(Number)
    return [y, m - 1]
  }, [monthKey])

  const grid = useMemo(() => buildGrid(year, monthIndex), [year, monthIndex])

  const itemsByDate = useMemo(() => {
    const map = new Map<string, Row[]>()
    for (const item of items) {
      if (!map.has(item.scheduled_date)) map.set(item.scheduled_date, [])
      map.get(item.scheduled_date)!.push(item)
    }
    return map
  }, [items])

  const monthLabel = useMemo(() => {
    const date = new Date(year, monthIndex, 1)
    const label = date.toLocaleDateString('es-PR', {
      month: 'long',
      year: 'numeric',
    })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }, [year, monthIndex])

  const todayIso = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Puerto_Rico',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return fmt.format(new Date())
  }, [])

  const prevMonth = monthOffset(year, monthIndex, -1)
  const nextMonth = monthOffset(year, monthIndex, 1)
  const currentMonth = todayIso.slice(0, 7)

  const openItem = openId
    ? items.find((item) => item.id === openId) ?? null
    : null

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Link
            href={{ pathname: '/calendar', query: { view: 'month', month: prevMonth } }}
            className="p-2 rounded-md text-zinc-600 hover:bg-zinc-100"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={16} />
          </Link>
          <Link
            href={{ pathname: '/calendar', query: { view: 'month', month: currentMonth } }}
            className="px-3 py-1.5 rounded-md text-xs text-zinc-600 hover:bg-zinc-100"
          >
            Hoy
          </Link>
          <Link
            href={{ pathname: '/calendar', query: { view: 'month', month: nextMonth } }}
            className="p-2 rounded-md text-zinc-600 hover:bg-zinc-100"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-lg border border-zinc-200 overflow-hidden bg-white">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-[10px] uppercase tracking-wider text-zinc-500 text-center"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 grid-rows-6 auto-rows-fr">
          {grid.map((cell, i) => {
            const dayItems = itemsByDate.get(cell.iso) ?? []
            const isToday = cell.iso === todayIso
            const isOtherMonth = cell.monthIndex !== monthIndex

            return (
              <div
                key={i}
                className={`min-h-[110px] border-r border-b border-zinc-200 last:border-r-0 p-1.5 ${
                  isOtherMonth ? 'bg-zinc-50/40' : 'bg-white'
                } ${(i + 1) % 7 === 0 ? 'border-r-0' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                      isToday
                        ? 'bg-zinc-900 text-white'
                        : isOtherMonth
                          ? 'text-zinc-400'
                          : 'text-zinc-700'
                    }`}
                  >
                    {cell.day}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayItems.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setOpenId(item.id)}
                      className={`w-full text-left rounded-md border ${
                        STATUS_BORDER[item.status]
                      } bg-white hover:bg-zinc-50 px-2 py-1 text-xs flex items-center gap-1.5 min-w-0`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          TYPE_DOT[item.type]
                        }`}
                      />
                      <span className="truncate text-zinc-800">
                        {item.idea || TYPE_LABEL[item.type]}
                      </span>
                    </button>
                  ))}
                  {dayItems.length > 3 && (
                    <div className="text-[10px] text-zinc-500 px-2">
                      +{dayItems.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
        <Legend dot="bg-violet-500" label="Reel" />
        <Legend dot="bg-sky-500" label="Carrusel" />
        <Legend dot="bg-amber-500" label="Static" />
      </div>

      {/* Item modal */}
      {openItem && (
        <ItemModal item={openItem} onClose={() => setOpenId(null)} />
      )}
    </div>
  )
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span>{label}</span>
    </div>
  )
}

function ItemModal({ item, onClose }: { item: Row; onClose: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const next = NEXT_STATUS[item.status]

  function handleAdvance() {
    if (!next) return
    startTransition(async () => {
      const res = await setItemStatus(item.id, next)
      if (res.error) setError(res.error)
      router.refresh()
    })
  }

  function handleDelete() {
    if (!confirm('¿Eliminar este contenido? No se puede recuperar.')) return
    startTransition(async () => {
      const res = await deleteItem(item.id)
      if (res.error) {
        setError(res.error)
        return
      }
      onClose()
      router.refresh()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs uppercase tracking-wider text-zinc-500">
              {formatDate(item.scheduled_date)}
            </span>
            <span className="text-zinc-300">·</span>
            <span className="text-xs text-zinc-600">
              {TYPE_LABEL[item.type]}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                STATUS_CHIP[item.status]
              }`}
            >
              {STATUS_LABEL[item.status]}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-500"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {item.idea && (
            <p className="text-sm text-zinc-700 mb-4 italic">
              &ldquo;{item.idea}&rdquo;
            </p>
          )}
          {item.output ? (
            <OutputEditor itemId={item.id} initialOutput={item.output} />
          ) : (
            <p className="text-sm text-zinc-500">Este item no tiene output AI.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 px-6 py-4 border-t border-zinc-200">
          {next && (
            <button
              type="button"
              disabled={pending}
              onClick={handleAdvance}
              className="rounded-lg bg-zinc-900 text-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-800 disabled:opacity-50"
            >
              Marcar como {STATUS_LABEL[next].toLowerCase()}
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={handleDelete}
            className="rounded-lg border border-red-200 text-red-700 px-3 py-1.5 text-xs font-medium hover:bg-red-50 disabled:opacity-50"
          >
            Eliminar
          </button>
          {error && (
            <span className="text-xs text-red-600 self-center">{error}</span>
          )}
        </div>
      </div>
    </div>
  )
}

type Cell = { day: number; monthIndex: number; year: number; iso: string }

function buildGrid(year: number, monthIndex: number): Cell[] {
  // 6 rows × 7 cols starting from the Sunday on/before the 1st of the month.
  const first = new Date(year, monthIndex, 1)
  const startDayOfWeek = first.getDay() // 0 = Sun
  const start = new Date(year, monthIndex, 1 - startDayOfWeek)

  const cells: Cell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push({
      day: d.getDate(),
      monthIndex: d.getMonth(),
      year: d.getFullYear(),
      iso: toIso(d),
    })
  }
  return cells
}

function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthOffset(year: number, monthIndex: number, delta: number): string {
  const date = new Date(year, monthIndex + delta, 1)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-PR', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}
