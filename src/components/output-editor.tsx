'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import type {
  ContentOutput,
  ReelOutput,
  CarouselOutput,
  StaticOutput,
} from '@/lib/types'
import { updateItemOutput } from '@/app/(taller)/calendar/actions'
import { CopyButton } from './copy-button'

/**
 * Build a "ready to paste into Instagram" string: caption + blank line +
 * hashtags. Works for any output type — IG only takes one caption per post,
 * so this is the same shape across reel/carousel/static.
 */
function buildIgPaste(output: ContentOutput): string {
  const caption = (output.caption_medium ?? '').trim()
  const hashtags = (output.hashtags ?? []).filter(Boolean).join(' ')
  return [caption, hashtags].filter(Boolean).join('\n\n')
}

type Props = {
  itemId: string
  initialOutput: ContentOutput
  photoUrl?: string | null
}

export function OutputEditor({ itemId, initialOutput, photoUrl }: Props) {
  const router = useRouter()
  const [output, setOutput] = useState<ContentOutput>(initialOutput)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = JSON.stringify(output) !== JSON.stringify(initialOutput)

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await updateItemOutput(itemId, output)
      if (res.error) {
        setError(res.error)
        toast.error(res.error)
        return
      }
      setSaved(true)
      toast.success('Cambios guardados')
      router.refresh()
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="space-y-5">
      {photoUrl && (
        <div className="rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Foto del contenido"
            className="w-full h-auto max-h-64 object-contain bg-zinc-50"
          />
        </div>
      )}

      <CopyForInstagram output={output} />

      {output.type === 'reel' && (
        <ReelEditor output={output} onChange={setOutput} />
      )}
      {output.type === 'carousel' && (
        <CarouselEditor output={output} onChange={setOutput} />
      )}
      {output.type === 'static' && (
        <StaticEditor output={output} onChange={setOutput} />
      )}

      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-zinc-100 sticky bottom-0 bg-white py-3 -mx-1 px-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || (!dirty && !saved)}
          className="rounded-lg bg-zinc-900 text-white px-5 py-2 text-sm font-medium hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          {pending ? 'Guardando…' : saved ? 'Guardado ✓' : 'Guardar cambios'}
        </button>
        {dirty && !pending && (
          <span className="text-xs text-zinc-500">Cambios sin guardar</span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}

// =============================================================================
// Copy-for-Instagram action
// =============================================================================

function CopyForInstagram({ output }: { output: ContentOutput }) {
  const [copied, setCopied] = useState(false)
  const text = buildIgPaste(output)

  async function handleCopy() {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Caption + hashtags copiados')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No pude copiar — intenta los botones individuales')
    }
  }

  if (!text) return null

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{ backgroundColor: 'var(--brand-accent, #18181b)' }}
      className="w-full inline-flex items-center justify-center gap-2 rounded-lg text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 transition"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copiado · Pega en Instagram' : 'Copiar para Instagram'}
    </button>
  )
}

// =============================================================================
// Field primitives
// =============================================================================

function Label({
  children,
  copyText,
}: {
  children: React.ReactNode
  copyText?: string
}) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-xs uppercase tracking-wider text-zinc-500">
        {children}
      </label>
      {copyText !== undefined && copyText.trim().length > 0 && (
        <CopyButton text={copyText} />
      )}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
    />
  )
}

function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-y"
    />
  )
}

function StringArrayEditor({
  items,
  onChange,
  itemPlaceholder,
  addLabel,
  copyable = true,
}: {
  items: string[]
  onChange: (next: string[]) => void
  itemPlaceholder?: string
  addLabel: string
  copyable?: boolean
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="text-xs text-zinc-400 pt-2.5 w-5 text-right shrink-0">
            {i + 1}.
          </span>
          <input
            type="text"
            value={item}
            onChange={(e) => {
              const next = [...items]
              next[i] = e.target.value
              onChange(next)
            }}
            placeholder={itemPlaceholder}
            className="flex-1 min-w-0 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
          {copyable && item.trim() && <CopyButton text={item} label="" />}
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="p-2 text-zinc-400 hover:text-red-600 shrink-0"
            aria-label="Eliminar"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900 ml-7"
      >
        <Plus size={12} />
        {addLabel}
      </button>
    </div>
  )
}

function HashtagsEditor({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [text, setText] = useState(value.join(' '))

  return (
    <textarea
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        onChange(
          e.target.value
            .split(/\s+/)
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => (t.startsWith('#') ? t : `#${t}`)),
        )
      }}
      rows={2}
      placeholder="#PuertoRico #moda #verano"
      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-y"
    />
  )
}

// =============================================================================
// Reel editor
// =============================================================================

function ReelEditor({
  output,
  onChange,
}: {
  output: ReelOutput
  onChange: (o: ReelOutput) => void
}) {
  function update<K extends keyof ReelOutput>(key: K, value: ReelOutput[K]) {
    onChange({ ...output, [key]: value })
  }

  return (
    <div className="space-y-5">
      <div>
        <Label>Hooks (3 opciones)</Label>
        <StringArrayEditor
          items={output.hooks}
          onChange={(hooks) => update('hooks', hooks)}
          itemPlaceholder="Hook que para el scroll"
          addLabel="Añadir hook"
        />
      </div>

      <div>
        <Label copyText={output.script.voiceover}>Script · Voiceover</Label>
        <TextArea
          value={output.script.voiceover}
          onChange={(v) =>
            update('script', { ...output.script, voiceover: v })
          }
          rows={4}
        />
      </div>

      <div>
        <Label copyText={output.script.on_screen_text.join('\n')}>
          Script · On-screen text
        </Label>
        <StringArrayEditor
          items={output.script.on_screen_text}
          onChange={(arr) =>
            update('script', { ...output.script, on_screen_text: arr })
          }
          itemPlaceholder="Texto que aparece overlay"
          addLabel="Añadir línea"
        />
      </div>

      <div>
        <Label copyText={output.caption_short}>Caption · Short</Label>
        <TextInput
          value={output.caption_short}
          onChange={(v) => update('caption_short', v)}
        />
      </div>

      <div>
        <Label copyText={output.caption_medium}>Caption · Medium</Label>
        <TextArea
          value={output.caption_medium}
          onChange={(v) => update('caption_medium', v)}
          rows={4}
        />
      </div>

      <div>
        <Label copyText={output.hashtags.join(' ')}>Hashtags</Label>
        <HashtagsEditor
          value={output.hashtags}
          onChange={(v) => update('hashtags', v)}
        />
      </div>

      <div>
        <Label copyText={output.manychat_keyword ?? ''}>
          ManyChat keyword (opcional)
        </Label>
        <TextInput
          value={output.manychat_keyword ?? ''}
          onChange={(v) => update('manychat_keyword', v || undefined)}
          placeholder="Ej: GUIA"
        />
      </div>
    </div>
  )
}

// =============================================================================
// Carousel editor
// =============================================================================

function CarouselEditor({
  output,
  onChange,
}: {
  output: CarouselOutput
  onChange: (o: CarouselOutput) => void
}) {
  function update<K extends keyof CarouselOutput>(
    key: K,
    value: CarouselOutput[K],
  ) {
    onChange({ ...output, [key]: value })
  }

  function updateSlide(
    i: number,
    patch: Partial<CarouselOutput['slides'][number]>,
  ) {
    const next = [...output.slides]
    next[i] = { ...next[i], ...patch }
    update('slides', next)
  }

  return (
    <div className="space-y-5">
      <div>
        <Label>Slides ({output.slides.length})</Label>
        <div className="space-y-3">
          {output.slides.map((slide, i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400">
                    Slide {i + 1}
                  </span>
                  <select
                    value={slide.purpose}
                    onChange={(e) =>
                      updateSlide(i, {
                        purpose: e.target
                          .value as CarouselOutput['slides'][number]['purpose'],
                      })
                    }
                    className="text-xs rounded border border-zinc-200 px-2 py-0.5 bg-white text-zinc-700"
                  >
                    <option value="cover">Cover</option>
                    <option value="body">Body</option>
                    <option value="cta">CTA</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <CopyButton
                    text={`${slide.headline}\n\n${slide.subtext}`}
                    label=""
                  />
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        'slides',
                        output.slides.filter((_, idx) => idx !== i),
                      )
                    }
                    className="p-1 text-zinc-400 hover:text-red-600"
                    aria-label="Eliminar slide"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <TextInput
                value={slide.headline}
                onChange={(v) => updateSlide(i, { headline: v })}
                placeholder="Headline"
              />
              <TextArea
                value={slide.subtext}
                onChange={(v) => updateSlide(i, { subtext: v })}
                rows={2}
                placeholder="Subtext"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              update('slides', [
                ...output.slides,
                { headline: '', subtext: '', purpose: 'body' as const },
              ])
            }
            className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900"
          >
            <Plus size={12} />
            Añadir slide
          </button>
        </div>
      </div>

      <div>
        <Label copyText={output.caption_short}>Caption · Short</Label>
        <TextInput
          value={output.caption_short}
          onChange={(v) => update('caption_short', v)}
        />
      </div>

      <div>
        <Label copyText={output.caption_medium}>Caption · Medium</Label>
        <TextArea
          value={output.caption_medium}
          onChange={(v) => update('caption_medium', v)}
          rows={4}
        />
      </div>

      <div>
        <Label copyText={output.hashtags.join(' ')}>Hashtags</Label>
        <HashtagsEditor
          value={output.hashtags}
          onChange={(v) => update('hashtags', v)}
        />
      </div>
    </div>
  )
}

// =============================================================================
// Static editor
// =============================================================================

function StaticEditor({
  output,
  onChange,
}: {
  output: StaticOutput
  onChange: (o: StaticOutput) => void
}) {
  function update<K extends keyof StaticOutput>(key: K, value: StaticOutput[K]) {
    onChange({ ...output, [key]: value })
  }

  return (
    <div className="space-y-5">
      <div>
        <Label copyText={output.caption_short}>Caption · Short</Label>
        <TextInput
          value={output.caption_short}
          onChange={(v) => update('caption_short', v)}
        />
      </div>

      <div>
        <Label copyText={output.caption_medium}>Caption · Medium</Label>
        <TextArea
          value={output.caption_medium}
          onChange={(v) => update('caption_medium', v)}
          rows={4}
        />
      </div>

      <div>
        <Label copyText={output.visual_direction}>Dirección visual</Label>
        <TextArea
          value={output.visual_direction}
          onChange={(v) => update('visual_direction', v)}
          rows={3}
        />
      </div>

      <div>
        <Label copyText={output.hashtags.join(' ')}>Hashtags</Label>
        <HashtagsEditor
          value={output.hashtags}
          onChange={(v) => update('hashtags', v)}
        />
      </div>
    </div>
  )
}
