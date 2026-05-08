'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  ChevronDown,
  ImagePlus,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import type { ContentOutput, ContentType } from '@/lib/types'
import { OutputDisplay } from './output-display'

type GenerateResponse = {
  item: {
    id: string
    scheduled_date: string
    type: ContentType
    photo_url: string | null
  }
  output: ContentOutput
}

const TYPES: { value: ContentType; label: string; hint: string }[] = [
  { value: 'reel', label: 'Reel', hint: '3 hooks + script + caption + hashtags' },
  { value: 'carousel', label: 'Carrusel', hint: '5-7 slides (cover + body + CTA) + caption' },
  { value: 'static', label: 'Static', hint: 'Caption + hashtags + dirección visual' },
]

const EXAMPLE_IDEAS: { type: ContentType; text: string }[] = [
  { type: 'reel', text: 'Mostrar lo que más se ha vendido esta semana' },
  { type: 'carousel', text: '5 piezas que combinan con cualquier jeans' },
  { type: 'reel', text: 'Behind the scenes de un día normal trabajando' },
  { type: 'static', text: 'Drop nuevo: la pieza estrella en 3 colores' },
]

const LOADING_MESSAGES = [
  'Leyendo tu brand brief…',
  'Pensando hooks que paren el scroll…',
  'Escribiendo en tu voz…',
  'Curando hashtags relevantes…',
  'Casi listo…',
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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photo, setPhoto] = useState<{ data: string; media_type: string } | null>(
    null,
  )
  const [loading, setLoading] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResponse | null>(null)

  // Rotate the loading messages every 2s while generating, so it doesn't feel
  // frozen during the 5-15s typical generation time.
  useEffect(() => {
    if (!loading) {
      setLoadingMessageIndex(0)
      return
    }
    const id = setInterval(() => {
      setLoadingMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length)
    }, 2000)
    return () => clearInterval(id)
  }, [loading])

  function openDatePicker() {
    if (dateInputRef.current) {
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
      setPhotoPreview(URL.createObjectURL(file))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error leyendo foto')
    }
  }

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhoto(null)
    setPhotoName(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function autoGrowTextarea(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`
  }

  function pickExample(ex: { type: ContentType; text: string }) {
    setType(ex.type)
    setIdea(ex.text)
    // Defer to next paint so the textarea has the new value before sizing.
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        autoGrowTextarea(textareaRef.current)
        textareaRef.current.focus()
      }
    })
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

  async function handleRegenerate(): Promise<void> {
    if (!result) return
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduled_date: date,
        type,
        idea,
        photo,
        update_id: result.item.id,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error ?? 'Error regenerando')
    }
    setResult(json as GenerateResponse)
    router.refresh()
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
        itemId={result.item.id}
        output={result.output}
        scheduled_date={result.item.scheduled_date}
        photoUrl={result.item.photo_url}
        onReset={reset}
        onRegenerate={handleRegenerate}
      />
    )
  }

  const activeTypeHint = TYPES.find((t) => t.value === type)?.hint
  const showExamples = !idea.trim() && !loading

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date pill — above */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={openDatePicker}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-sm font-medium text-zinc-700 transition"
          aria-label="Cambiar fecha"
        >
          <Calendar size={14} />
          {formatDatePill(date)}
          <ChevronDown size={14} className="text-zinc-500" />
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
          placeholder="Cuenta la idea — qué quieres mostrar, sentir o vender."
          rows={2}
          required
          disabled={loading}
          className="w-full resize-none px-5 pt-5 pb-16 text-base bg-transparent border-0 outline-0 placeholder:text-zinc-400 text-zinc-900 disabled:opacity-60"
        />

        {/* Bottom bar inside the box */}
        <div className="absolute left-3 right-3 bottom-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <label
              className={`p-2 rounded-full hover:bg-zinc-100 cursor-pointer text-zinc-500 hover:text-zinc-900 transition ${
                loading ? 'pointer-events-none opacity-50' : ''
              }`}
              title="Subir foto"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePhoto}
                disabled={loading}
                className="hidden"
              />
              <ImagePlus size={18} />
            </label>
            {photoPreview && (
              <span className="inline-flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-full bg-zinc-100 text-xs text-zinc-700 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt={photoName ?? 'Foto'}
                  className="h-7 w-7 rounded-full object-cover shrink-0"
                />
                <span className="max-w-[120px] truncate">{photoName}</span>
                <button
                  type="button"
                  onClick={clearPhoto}
                  disabled={loading}
                  className="p-0.5 rounded-full hover:bg-zinc-200 disabled:opacity-50"
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
            style={{ backgroundColor: 'var(--brand-accent, #18181b)' }}
            className="p-2.5 rounded-full text-white hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0"
            title="Generar"
            aria-label="Generar contenido"
          >
            {loading ? <Spinner /> : <Send size={16} />}
          </button>
        </div>
      </div>

      {/* Loading message — replaces type pills/examples while generating */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-zinc-600">
          <Sparkles size={14} className="animate-pulse text-zinc-500" />
          <span aria-live="polite">{LOADING_MESSAGES[loadingMessageIndex]}</span>
        </div>
      ) : (
        <>
          {/* Type pills + active hint */}
          <div className="space-y-1.5">
            <div className="flex justify-center gap-2">
              {TYPES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  style={
                    type === opt.value
                      ? { backgroundColor: 'var(--brand-accent, #18181b)' }
                      : undefined
                  }
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                    type === opt.value
                      ? 'text-white'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {activeTypeHint && (
              <p className="text-center text-xs text-zinc-500">{activeTypeHint}</p>
            )}
          </div>

          {/* Examples — only when textarea is empty */}
          {showExamples && (
            <div className="pt-4">
              <div className="flex items-center justify-center gap-1.5 mb-2 text-xs text-zinc-500">
                <Sparkles size={12} />
                <span>O empieza con un ejemplo</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EXAMPLE_IDEAS.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pickExample(ex)}
                    className="text-left rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 px-3 py-2.5 transition group"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-zinc-400 group-hover:text-zinc-600 mb-0.5">
                      {ex.type === 'reel' ? 'Reel' : ex.type === 'carousel' ? 'Carrusel' : 'Static'}
                    </div>
                    <div className="text-sm text-zinc-700 group-hover:text-zinc-900 leading-snug">
                      {ex.text}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

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
