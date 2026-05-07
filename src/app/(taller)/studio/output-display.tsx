'use client'

import Link from 'next/link'
import type { ContentOutput } from '@/lib/types'
import { OutputEditor } from '@/components/output-editor'

type Props = {
  itemId: string
  output: ContentOutput
  scheduled_date: string
  photoUrl?: string | null
  onReset: () => void
}

export function OutputDisplay({
  itemId,
  output,
  scheduled_date,
  photoUrl,
  onReset,
}: Props) {
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

      <div className="flex gap-3 pt-4 border-t border-zinc-100">
        <button
          type="button"
          onClick={onReset}
          className="flex-1 rounded-lg bg-zinc-900 text-white px-4 py-3 text-sm font-medium hover:bg-zinc-800"
        >
          Crear otro
        </button>
        <Link
          href="/calendar"
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-center hover:bg-zinc-50"
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
