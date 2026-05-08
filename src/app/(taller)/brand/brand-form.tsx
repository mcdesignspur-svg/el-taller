'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { BrandBrief } from '@/lib/types'
import { saveBrandBrief, type BrandFormState } from './actions'

const initialState: BrandFormState = { status: 'idle' }

type Props = {
  brief: Partial<BrandBrief>
  logoUrl: string | null
}

export function BrandForm({ brief, logoUrl }: Props) {
  const [state, action, pending] = useActionState<BrandFormState, FormData>(
    saveBrandBrief,
    initialState,
  )

  useEffect(() => {
    if (state.status === 'saved') toast.success('Brand brief guardado')
    if (state.status === 'error') toast.error(state.message)
  }, [state])

  return (
    <form action={action} className="space-y-8" encType="multipart/form-data">
      <Section
        title="Lo básico"
        hint="Lo mínimo que la AI necesita para entender qué vendes y a quién."
      >
        <Field
          label="¿Qué vendes?"
          name="products"
          defaultValue={brief.products ?? ''}
          placeholder="Ej: Ropa femenina contemporánea, foco en tallas inclusivas. Boutique física + online."
          rows={3}
        />
        <Field
          label="¿Quién es tu cliente típico?"
          name="audience"
          defaultValue={brief.audience ?? ''}
          placeholder="Ej: Mujeres 25-45 en Puerto Rico que quieren verse bien sin pagar precios de boutique de SJ."
          rows={3}
        />
        <Field
          label="Ubicación principal"
          name="location"
          defaultValue={brief.location ?? ''}
          placeholder="Ej: Caguas, PR"
          rows={1}
        />
      </Section>

      <Section
        title="Tu voz"
        hint="Esto es lo que más mueve la calidad del output. Sé específico."
      >
        <Field
          label="¿Cómo le hablas a tu audiencia?"
          name="voice"
          defaultValue={brief.voice ?? ''}
          placeholder="Ej: Como una amiga que sabe de moda. Spanglish natural — mezcla español con palabras en inglés sin forzar. Cero tono corporativo. Uso emojis con moderación. Cierro con CTAs directos pero amistosos."
          rows={5}
        />
        <Field
          label="Captions tuyos que han funcionado"
          name="sample_captions"
          defaultValue={brief.sample_captions ?? ''}
          placeholder="Pega 2-3 captions reales tuyos que tuvieron buen engagement. La AI usa estos como referencia de tu estilo exacto. Sepáralos con una línea en blanco."
          rows={6}
        />
      </Section>

      <Section
        title="Hashtags y CTAs"
        hint="Lo que la AI debe incluir consistentemente."
      >
        <Field
          label="Hashtags base (separados por espacio)"
          name="default_hashtags"
          defaultValue={brief.default_hashtags ?? ''}
          placeholder="#BEBoutique #ModaPR #BoutiquePR #Caguas #Puertorrico"
          rows={2}
        />
        <Field
          label="ManyChat keywords activas (opcional)"
          name="manychat_keywords"
          defaultValue={brief.manychat_keywords ?? ''}
          placeholder="GUIA, INFO, PRECIO — palabras que la gente comenta para activar tu ManyChat"
          rows={2}
        />
      </Section>

      <Section
        title="Apariencia"
        hint="Logo y colores se aplican al studio cuando entras. Los colores también guían a la AI para statics."
      >
        <LogoField currentLogoUrl={logoUrl} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ColorField
            label="Color primario"
            name="primary_color"
            defaultValue={brief.primary_color ?? ''}
            placeholder="terracotta / #B45A3C"
          />
          <ColorField
            label="Color secundario"
            name="secondary_color"
            defaultValue={brief.secondary_color ?? ''}
            placeholder="cream / #F5EBDD"
          />
        </div>
        <Field
          label="Estilo de fotografía/aesthetic"
          name="visual_style"
          defaultValue={brief.visual_style ?? ''}
          placeholder="Ej: Luz natural, fondo limpio, modelo wearing the piece. Mood warm + earthy. Cero stock photos."
          rows={3}
        />
      </Section>

      <Section title="A evitar" hint="Opcional. Palabras, temas o framings que la AI no debe usar.">
        <Field
          label="Cosas a evitar"
          name="do_dont"
          defaultValue={brief.do_dont ?? ''}
          placeholder="Ej: No usar la palabra 'mami'. No comparar con marcas grandes. Evitar urgencia falsa tipo 'últimas piezas!!!'."
          rows={3}
        />
      </Section>

      <div className="flex items-center gap-3 pt-4 border-t border-zinc-100 sticky bottom-0 bg-white py-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? 'Guardando…' : 'Guardar brand brief'}
        </button>
        {state.status === 'saved' && (
          <span className="text-sm text-emerald-700">Guardado ✓</span>
        )}
        {state.status === 'error' && (
          <span className="text-sm text-red-600">{state.message}</span>
        )}
      </div>

      {state.status === 'saved' && (
        <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-sm font-medium text-emerald-900 mb-1">
            Tu voz está guardada.
          </p>
          <p className="text-xs text-emerald-800 mb-3">
            La AI ya puede generar contenido en el tono de tu negocio.
          </p>
          <Link
            href="/studio"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 text-white px-4 py-2 text-xs font-medium hover:bg-emerald-800 transition"
          >
            <Sparkles size={14} />
            Probar la voz en el studio →
          </Link>
        </div>
      )}
    </form>
  )
}

// ─── Logo field with file picker + preview + remove control ──────────────────

function LogoField({ currentLogoUrl }: { currentLogoUrl: string | null }) {
  const [preview, setPreview] = useState<string | null>(currentLogoUrl)
  const [removed, setRemoved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setRemoved(false)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function onRemove() {
    setPreview(null)
    setRemoved(true)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">
        Logo
      </label>
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Logo preview"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
              sin logo
            </span>
          )}
        </div>
        <div className="flex-1 space-y-1">
          <input
            ref={fileRef}
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={onPick}
            className="block w-full text-xs text-zinc-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 file:cursor-pointer cursor-pointer"
          />
          <p className="text-[11px] text-zinc-500">
            PNG, JPG, WebP o SVG. Máximo 2MB. Se renderiza en el header del studio.
          </p>
          {currentLogoUrl && !removed && (
            <button
              type="button"
              onClick={onRemove}
              className="text-[11px] text-red-600 hover:text-red-700 underline"
            >
              Quitar logo actual
            </button>
          )}
        </div>
      </div>
      {/* Hidden field to signal removal to the server action. */}
      <input type="hidden" name="remove_logo" value={removed ? '1' : ''} />
    </div>
  )
}

// ─── Color field with native picker synced to free-form text input ───────────

function extractHexFromText(text: string): string {
  const m = text.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/)
  if (!m) return '#000000'
  let hex = m[1]
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('')
  }
  return `#${hex.toLowerCase()}`
}

function ColorField({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string
  name: string
  defaultValue: string
  placeholder?: string
}) {
  const [text, setText] = useState(defaultValue)
  const hex = extractHexFromText(text)

  function onPickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newHex = e.target.value
    // If text already has a hex, replace it. Otherwise append.
    if (/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/.test(text)) {
      setText(text.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/, newHex))
    } else {
      setText(text ? `${text} / ${newHex}` : newHex)
    }
  }

  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5"
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hex}
          onChange={onPickerChange}
          className="h-9 w-9 shrink-0 rounded-md border border-zinc-200 cursor-pointer bg-white"
          aria-label={`${label} picker`}
        />
        <input
          id={name}
          name={name}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
        />
      </div>
    </div>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 1,
}: {
  label: string
  name: string
  defaultValue: string
  placeholder?: string
  rows?: number
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5"
      >
        {label}
      </label>
      {rows === 1 ? (
        <input
          id={name}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
        />
      ) : (
        <textarea
          id={name}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-y"
        />
      )}
    </div>
  )
}
