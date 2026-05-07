'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Paperclip, Send, X } from 'lucide-react'
import type { ContentOutput, ContentType } from '@/lib/types'
import { OutputDisplay } from './output-display'

type GenerateResponse = {
  item: { id: string; scheduled_date: string; type: ContentType }
  output: ContentOutput
}

const TYPES: { value: ContentType; label: string }[] = [
  { value: 'reel', label: 'Reel' },
  { value: 'carousel', label: 'Carrusel' },
  { value: 'static', label: 'Static' },
]

function todayInPR(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Puerto_Rico',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(new Date())
}

function formatDatePill(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === tomorrow.toDateString()) return 'Mañana'

  return date.toLocaleDateString('es-PR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  })
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
  const dateInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  function openDatePicker() {
    if (dateInputRef.current) {
      // Modern browsers support showPicker(); fall back to focus().
      const input = dateInputRef.current as HTMLInputElement & {
        showPicker?: () => void
      }
      if (typeof input.showPicker === 'function') input.showPicker()
      else input.focus()
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
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

  function clearPhoto() {
    setPhoto(null)
    setPhotoName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function autoGrowTextarea(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!idea.trim()) {
      setError('Escribe la idea del contenido')
      textareaRef.current?.focus()
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
    clearPhoto()
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date pill — above */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={openDatePicker}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-sm font-medium text-zinc-700 transition"
        >
          <Calendar size={14} />
          {formatDatePill(date)}
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* Prompt box */}
      <div className="relative rounded-3xl border border-zinc-200 bg-white shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-zinc-400 transition-all">
        <textarea
          ref={textareaRef}
          value={idea}
          onChange={(e) => {
            setIdea(e.target.value)
            autoGrowTextarea(e.currentTarget)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
          placeholder="Cuenta la idea del contenido…"
          rows={2}
          required
          className="w-full resize-none px-5 pt-5 pb-16 text-base bg-transparent border-0 outline-0 placeholder:text-zinc-400 text-zinc-900"
        />

        {/* Bottom bar inside the box */}
        <div className="absolute left-3 right-3 bottom-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label
              className="p-2 rounded-full hover:bg-zinc-100 cursor-pointer text-zinc-500 hover:text-zinc-900 transition"
              title="Subir foto"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePhoto}
                className="hidden"
              />
              <Paperclip size={18} />
            </label>
            {photoName && (
              <span className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-zinc-100 text-xs text-zinc-700">
                <span className="max-w-[160px] truncate">{photoName}</span>
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="p-0.5 rounded-full hover:bg-zinc-200"
                  aria-label="Quitar foto"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !idea.trim()}
            className="p-2.5 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Generar"
          >
            {loading ? <Spinner /> : <Send size={16} />}
          </button>
        </div>
      </div>

      {/* Type pills — below */}
      <div className="flex justify-center gap-2">
        {TYPES.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setType(opt.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              type === opt.value
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </form>
  )
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
