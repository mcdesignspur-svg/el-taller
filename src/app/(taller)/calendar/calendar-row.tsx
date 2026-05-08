'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ContentItem, ContentStatus } from '@/lib/types'
import { OutputEditor } from '@/components/output-editor'
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
    'id' | 'scheduled_date' | 'type' | 'idea' | 'output' | 'status' | 'photo_url'
  >
}

export function CalendarRow({ item }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [regenerating, setRegenerating] = useState(false)
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

  async function handleRegenerate() {
    if (!item.idea) {
      toast.error('Este item no tiene idea — abre Editar y añádele una primero')
      return
    }
    if (
      !confirm(
        '¿Regenerar el contenido AI? Sobreescribe el output actual. Se mantienen idea, fecha y foto.',
      )
    ) {
      return
    }
    setRegenerating(true)
    setError(null)
    try {
      // Re-encode the existing photo (if any) from its signed URL so the AI
      // sees the same visual context as the original generation.
      let photoPayload: { data: string; media_type: string } | null = null
      if (item.photo_url) {
        const res = await fetch(item.photo_url)
        if (!res.ok) throw new Error('No pude leer la foto del calendario')
        const blob = await res.blob()
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader()
          fr.onload = () => resolve(fr.result as string)
          fr.onerror = () => reject(new Error('No pude codificar la foto'))
          fr.readAsDataURL(blob)
        })
        const [meta, data] = dataUrl.split(',')
        const mt = meta.match(/data:(.*?);/)?.[1] ?? blob.type
        const allowed = new Set([
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
        ])
        if (allowed.has(mt)) {
          photoPayload = { data, media_type: mt }
        }
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update_id: item.id,
          scheduled_date: item.scheduled_date,
          type: item.type,
          idea: item.idea,
          photo: photoPayload,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          (json as { error?: string }).error ?? 'Error regenerando',
        )
      }
      toast.success('Contenido regenerado')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error regenerando'
      setError(msg)
      toast.error(msg)
    } finally {
      setRegenerating(false)
    }
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
          {open ? 'Cerrar' : 'Editar'}
        </button>
      </div>

      {open && (
        <div className="border-t border-zinc-200 px-4 py-4 space-y-4 bg-zinc-50/50">
          {item.output ? (
            <OutputEditor
              itemId={item.id}
              initialOutput={item.output}
              photoUrl={item.photo_url}
            />
          ) : (
            <p className="text-sm text-zinc-500">Este item no tiene output AI.</p>
          )}

          <div className="flex flex-wrap gap-2 pt-3 border-t border-zinc-200">
            {next && (
              <button
                type="button"
                disabled={pending || regenerating}
                onClick={handleAdvance}
                className="rounded-lg bg-zinc-900 text-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-800 disabled:opacity-50"
              >
                Marcar como {STATUS_LABELS[next].toLowerCase()}
              </button>
            )}
            <button
              type="button"
              disabled={pending || regenerating}
              onClick={handleRegenerate}
              className="rounded-lg border border-zinc-300 text-zinc-800 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 disabled:opacity-50"
            >
              {regenerating ? 'Regenerando…' : 'Regenerar'}
            </button>
            <button
              type="button"
              disabled={pending || regenerating}
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

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-PR', {
    month: 'short',
    day: 'numeric',
  })
}
