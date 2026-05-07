'use client'

import { useActionState } from 'react'
import type { BrandBrief } from '@/lib/types'
import { saveBrandBrief, type BrandFormState } from './actions'

const initialState: BrandFormState = { status: 'idle' }

type Props = {
  brief: Partial<BrandBrief>
}

export function BrandForm({ brief }: Props) {
  const [state, action, pending] = useActionState<BrandFormState, FormData>(
    saveBrandBrief,
    initialState,
  )

  return (
    <form action={action} className="space-y-8">
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

      <Section title="Estilo visual" hint="Opcional. Útil para statics y dirección visual.">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Color primario"
            name="primary_color"
            defaultValue={brief.primary_color ?? ''}
            placeholder="Ej: terracotta / #B45A3C"
            rows={1}
          />
          <Field
            label="Color secundario"
            name="secondary_color"
            defaultValue={brief.secondary_color ?? ''}
            placeholder="Ej: cream / #F5EBDD"
            rows={1}
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
    </form>
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
