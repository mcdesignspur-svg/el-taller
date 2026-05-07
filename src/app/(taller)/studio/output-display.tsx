'use client'

import Link from 'next/link'
import type {
  ContentOutput,
  ReelOutput,
  CarouselOutput,
  StaticOutput,
} from '@/lib/types'

type Props = {
  output: ContentOutput
  scheduled_date: string
  onReset: () => void
}

export function OutputDisplay({ output, scheduled_date, onReset }: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        ✓ Guardado en el calendario para{' '}
        <span className="font-medium">{formatDate(scheduled_date)}</span>
      </div>

      {output.type === 'reel' && <ReelView output={output} />}
      {output.type === 'carousel' && <CarouselView output={output} />}
      {output.type === 'static' && <StaticView output={output} />}

      <div className="flex gap-3 pt-2">
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

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}

function CopyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm whitespace-pre-wrap font-mono text-zinc-800">
      {text}
    </div>
  )
}

function ReelView({ output }: { output: ReelOutput }) {
  return (
    <div className="space-y-5">
      <Section title="Hooks (3 opciones)">
        <ul className="space-y-2">
          {output.hooks.map((h, i) => (
            <li key={i} className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm">
              <span className="text-zinc-400 mr-2">{i + 1}.</span>
              {h}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Script · Voiceover">
        <CopyBlock text={output.script.voiceover} />
      </Section>

      <Section title="Script · On-screen text">
        <ul className="space-y-1.5">
          {output.script.on_screen_text.map((t, i) => (
            <li key={i} className="text-sm text-zinc-700 px-3 py-1.5 rounded bg-zinc-100">
              {t}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Caption · Short">
        <CopyBlock text={output.caption_short} />
      </Section>

      <Section title="Caption · Medium">
        <CopyBlock text={output.caption_medium} />
      </Section>

      <Section title="Hashtags">
        <p className="text-sm text-zinc-700">{output.hashtags.join(' ')}</p>
      </Section>

      {output.manychat_keyword && (
        <Section title="ManyChat keyword">
          <p className="text-sm font-mono">{output.manychat_keyword}</p>
        </Section>
      )}
    </div>
  )
}

function CarouselView({ output }: { output: CarouselOutput }) {
  return (
    <div className="space-y-5">
      <Section title={`Slides (${output.slides.length})`}>
        <ol className="space-y-3">
          {output.slides.map((s, i) => (
            <li
              key={i}
              className="rounded-lg border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs uppercase tracking-wider text-zinc-400">
                  Slide {i + 1} · {s.purpose}
                </span>
              </div>
              <p className="font-medium text-sm mb-1">{s.headline}</p>
              <p className="text-sm text-zinc-600">{s.subtext}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Caption · Short">
        <CopyBlock text={output.caption_short} />
      </Section>
      <Section title="Caption · Medium">
        <CopyBlock text={output.caption_medium} />
      </Section>
      <Section title="Hashtags">
        <p className="text-sm text-zinc-700">{output.hashtags.join(' ')}</p>
      </Section>
    </div>
  )
}

function StaticView({ output }: { output: StaticOutput }) {
  return (
    <div className="space-y-5">
      <Section title="Caption · Short">
        <CopyBlock text={output.caption_short} />
      </Section>
      <Section title="Caption · Medium">
        <CopyBlock text={output.caption_medium} />
      </Section>
      <Section title="Hashtags">
        <p className="text-sm text-zinc-700">{output.hashtags.join(' ')}</p>
      </Section>
      <Section title="Dirección visual">
        <CopyBlock text={output.visual_direction} />
      </Section>
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
