'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { ContentOutput } from '@/lib/types'
import { OutputEditor } from '@/components/output-editor'

type Props = {
  itemId: string
  output: ContentOutput
  scheduled_date: string
  photoUrl?: string | null
  onReset: () => void
  onRegenerate?: () => Promise<void>
}

export function OutputDisplay({
  itemId,
  output,
  scheduled_date,
  photoUrl,
  onReset,
  onRegenerate,
}: Props) {
  const [regenerating, setRegenerating] = useState(false)

  async function handleRegenerate() {
    if (!onRegenerate) return
    setRegenerating(true)
    try {
      await onRegenerate()
      toast.success('Regenerado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pude regenerar')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        ✓ Guardado en el calendario para{' '}
        <span className="font-medium">{formatDate(scheduled_date)}</span>
        <span className="text-emerald-700"> · Edita lo que quieras y guarda.</span>
      </div>

      <OutputEditor
        itemId={itemId}
        initialOutput={output}
        photoUrl={photoUrl}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-zinc-100">
        {onRegenerate && (
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
            {regenerating ? 'Regenerando…' : 'Regenerar'}
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg bg-zinc-900 text-white px-4 py-3 text-sm font-medium hover:bg-zinc-800"
        >
          Crear otro
        </button>
        <Link
          href="/calendar"
          className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-center hover:bg-zinc-50"
        >
          Ver calendario
        </Link>
      </div>
    </div>
  )
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
