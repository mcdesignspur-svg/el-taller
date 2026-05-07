'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import type {
  ContentOutput,
  ReelOutput,
  CarouselOutput,
  StaticOutput,
} from '@/lib/types'
import { updateItemOutput } from '@/app/(taller)/calendar/actions'

type Props = {
  itemId: string
  initialOutput: ContentOutput
}

export function OutputEditor({ itemId, initialOutput }: Props) {
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
        return
      }
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="space-y-5">
      {output.type === 'reel' && (
        <ReelEditor output={output} onChange={setOutput} />
      )}
      {output.type === 'carousel' && (
        <CarouselEditor output={output} onChange={setOutput} />
      )}
      {output.type === 'static' && (
        <StaticEditor output={output} onChange={setOutput} />
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-zinc-100">
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
// Field primitives
// =============================================================================

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">
      {children}
    </label>
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
}: {
  items: string[]
  onChange: (next: string[]) => void
  itemPlaceholder?: string
  addLabel: string
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="text-xs text-zinc-400 pt-2.5 w-5 text-right">
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
            className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="p-2 text-zinc-400 hover:text-red-600"
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
        <Label>Script · Voiceover</Label>
        <TextArea
          value={output.script.voiceover}
          onChange={(v) =>
            update('script', { ...output.script, voiceover: v })
          }
          rows={4}
        />
      </div>

      <div>
        <Label>Script · On-screen text</Label>
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
        <Label>Caption · Short</Label>
        <TextInput
          value={output.caption_short}
          onChange={(v) => update('caption_short', v)}
        />
      </div>

      <div>
        <Label>Caption · Medium</Label>
        <TextArea
          value={output.caption_medium}
          onChange={(v) => update('caption_medium', v)}
          rows={4}
        />
      </div>

      <div>
        <Label>Hashtags</Label>
        <HashtagsEditor
          value={output.hashtags}
          onChange={(v) => update('hashtags', v)}
        />
      </div>

      <div>
        <Label>ManyChat keyword (opcional)</Label>
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
              <div className="flex items-center justify-between">
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
        <Label>Caption · Short</Label>
        <TextInput
          value={output.caption_short}
          onChange={(v) => update('caption_short', v)}
        />
      </div>

      <div>
        <Label>Caption · Medium</Label>
        <TextArea
          value={output.caption_medium}
          onChange={(v) => update('caption_medium', v)}
          rows={4}
        />
      </div>

      <div>
        <Label>Hashtags</Label>
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
        <Label>Caption · Short</Label>
        <TextInput
          value={output.caption_short}
          onChange={(v) => update('caption_short', v)}
        />
      </div>

      <div>
        <Label>Caption · Medium</Label>
        <TextArea
          value={output.caption_medium}
          onChange={(v) => update('caption_medium', v)}
          rows={4}
        />
      </div>

      <div>
        <Label>Dirección visual</Label>
        <TextArea
          value={output.visual_direction}
          onChange={(v) => update('visual_direction', v)}
          rows={3}
        />
      </div>

      <div>
        <Label>Hashtags</Label>
        <HashtagsEditor
          value={output.hashtags}
          onChange={(v) => update('hashtags', v)}
        />
      </div>
    </div>
  )
}
