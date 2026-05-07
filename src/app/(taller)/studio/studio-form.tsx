'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ContentOutput, ContentType } from '@/lib/types'
import { OutputDisplay } from './output-display'

type GenerateResponse = {
  item: { id: string; scheduled_date: string; type: ContentType }
  output: ContentOutput
}

const TYPES: { value: ContentType; label: string; hint: string }[] = [
  { value: 'reel', label: 'Reel', hint: 'Video corto' },
  { value: 'carousel', label: 'Carrusel', hint: '5-7 slides' },
  { value: 'static', label: 'Static', hint: 'Una imagen' },
]

function todayInPR(): string {
  // YYYY-MM-DD in America/Puerto_Rico
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Puerto_Rico',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(new Date())
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(new Error('No pude leer el archivo'))
    reader.readAsDataURL(file)
  })
}

export function StudioForm() {
  const router = useRouter()
  const [date, setDate] = useState(todayInPR())
  const [idea, setIdea] = useState('')
  const [type, setType] = useState<ContentType>('reel')
  const [photoName, setPhotoName] = useState<string | null>(null)
  const [photo, setPhoto] = useState<{ data: string; media_type: string } | null>(
    null,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResponse | null>(null)

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      setPhoto(null)
      setPhotoName(null)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La foto pesa más de 5MB. Súbela más liviana.')
      return
    }
    try {
      const data = await fileToBase64(file)
      setPhoto({ data, media_type: file.type })
      setPhotoName(file.name)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error leyendo foto')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!idea.trim()) {
      setError('Escribe la idea del contenido')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_date: date,
          type,
          idea,
          photo,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Error generando contenido')
        setLoading(false)
        return
      }

      setResult(json as GenerateResponse)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setResult(null)
    setIdea('')
    setPhoto(null)
    setPhotoName(null)
    setError(null)
  }

  if (result) {
    return (
      <OutputDisplay
        output={result.output}
        scheduled_date={result.item.scheduled_date}
        onReset={reset}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
          Fecha
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
          Idea
        </label>
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Ej: Reel mostrando la nueva colección de verano. Quiero hablar del fit y los colores."
          rows={4}
          required
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
          Foto <span className="normal-case text-zinc-400">(opcional)</span>
        </label>
        <label className="flex items-center justify-center w-full rounded-lg border-2 border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 cursor-pointer">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handlePhoto}
            className="hidden"
          />
          {photoName ? (
            <span className="text-zinc-900 font-medium">{photoName}</span>
          ) : (
            <span>Subir foto · La AI la analiza para generar el contenido</span>
          )}
        </label>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
          Tipo
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setType(opt.value)}
              className={`rounded-lg border px-4 py-3 text-sm transition ${
                type === opt.value
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-300 hover:border-zinc-500'
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div
                className={`text-xs mt-0.5 ${
                  type === opt.value ? 'text-zinc-300' : 'text-zinc-500'
                }`}
              >
                {opt.hint}
              </div>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-zinc-900 text-white px-4 py-3 text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 transition"
      >
        {loading ? 'Generando…' : 'Generar contenido'}
      </button>
    </form>
  )
}
