'use client'

import { useState, useTransition } from 'react'
import type { ContentItem, ContentStatus } from '@/lib/types'
import { deleteItem, setItemStatus } from './actions'

const TYPE_LABELS: Record<ContentItem['type'], string> = {
  reel: 'Reel',
  carousel: 'Carrusel',
  static: 'Static',
}

const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: 'Draft',
  approved: 'Aprobado',
  published: 'Publicado',
}

const NEXT_STATUS: Record<ContentStatus, ContentStatus | null> = {
  draft: 'approved',
  approved: 'published',
  published: null,
}

const STATUS_CLASSES: Record<ContentStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-700',
  approved: 'bg-amber-100 text-amber-800',
  published: 'bg-emerald-100 text-emerald-800',
}

type Props = {
  item: Pick<
    ContentItem,
    'id' | 'scheduled_date' | 'type' | 'idea' | 'output' | 'status'
  >
}

export function CalendarRow({ item }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const next = NEXT_STATUS[item.status]

  function handleAdvance() {
    if (!next) return
    startTransition(async () => {
      const res = await setItemStatus(item.id, next)
      if (res.error) setError(res.error)
    })
  }

  function handleDelete() {
    if (!confirm('¿Eliminar este contenido? No se puede recuperar.')) return
    startTransition(async () => {
      const res = await deleteItem(item.id)
      if (res.error) setError(res.error)
    })
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs uppercase tracking-wider text-zinc-500">
              {formatDate(item.scheduled_date)}
            </span>
            <span className="text-zinc-300">·</span>
            <span className="text-xs text-zinc-600">{TYPE_LABELS[item.type]}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                STATUS_CLASSES[item.status]
              }`}
            >
              {STATUS_LABELS[item.status]}
            </span>
          </div>
          <p className="text-sm text-zinc-900 truncate">
            {item.idea ?? <span className="text-zinc-400">Sin idea</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-zinc-500 hover:text-zinc-900 px-2 py-1"
        >
          {open ? 'Cerrar' : 'Ver'}
        </button>
      </div>

      {open && (
        <div className="border-t border-zinc-200 px-4 py-4 space-y-4 bg-zinc-50/50">
          {item.output ? (
            <OutputCompact output={item.output} />
          ) : (
            <p className="text-sm text-zinc-500">Este item no tiene output AI.</p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {next && (
              <button
                type="button"
                disabled={pending}
                onClick={handleAdvance}
                className="rounded-lg bg-zinc-900 text-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-800 disabled:opacity-50"
              >
                Marcar como {STATUS_LABELS[next].toLowerCase()}
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
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}

function OutputCompact({ output }: { output: NonNullable<ContentItem['output']> }) {
  if (output.type === 'reel') {
    return (
      <div className="space-y-3 text-sm">
        <Field label="Hooks">
          <ul className="space-y-1">
            {output.hooks.map((h, i) => (
              <li key={i} className="text-zinc-700">
                {i + 1}. {h}
              </li>
            ))}
          </ul>
        </Field>
        <Field label="Voiceover">
          <p className="text-zinc-700 whitespace-pre-wrap">
            {output.script.voiceover}
          </p>
        </Field>
        <Field label="Caption short">
          <p className="text-zinc-700">{output.caption_short}</p>
        </Field>
        <Field label="Caption medium">
          <p className="text-zinc-700 whitespace-pre-wrap">{output.caption_medium}</p>
        </Field>
        <Field label="Hashtags">
          <p className="text-zinc-600 text-xs">{output.hashtags.join(' ')}</p>
        </Field>
      </div>
    )
  }
  if (output.type === 'carousel') {
    return (
      <div className="space-y-3 text-sm">
        <Field label={`Slides (${output.slides.length})`}>
          <ol className="space-y-2">
            {output.slides.map((s, i) => (
              <li
                key={i}
                className="rounded border border-zinc-200 bg-white p-2"
              >
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-0.5">
                  Slide {i + 1} · {s.purpose}
                </div>
                <p className="font-medium text-xs">{s.headline}</p>
                <p className="text-xs text-zinc-600">{s.subtext}</p>
              </li>
            ))}
          </ol>
        </Field>
        <Field label="Caption short">
          <p className="text-zinc-700">{output.caption_short}</p>
        </Field>
        <Field label="Caption medium">
          <p className="text-zinc-700 whitespace-pre-wrap">{output.caption_medium}</p>
        </Field>
        <Field label="Hashtags">
          <p className="text-zinc-600 text-xs">{output.hashtags.join(' ')}</p>
        </Field>
      </div>
    )
  }
  return (
    <div className="space-y-3 text-sm">
      <Field label="Caption short">
        <p className="text-zinc-700">{output.caption_short}</p>
      </Field>
      <Field label="Caption medium">
        <p className="text-zinc-700 whitespace-pre-wrap">{output.caption_medium}</p>
      </Field>
      <Field label="Dirección visual">
        <p className="text-zinc-700 whitespace-pre-wrap">{output.visual_direction}</p>
      </Field>
      <Field label="Hashtags">
        <p className="text-zinc-600 text-xs">{output.hashtags.join(' ')}</p>
      </Field>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
        {label}
      </p>
      {children}
    </div>
  )
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-PR', {
    month: 'short',
    day: 'numeric',
  })
}
