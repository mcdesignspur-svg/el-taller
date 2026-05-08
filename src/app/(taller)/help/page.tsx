import Link from 'next/link'
import {
  Calendar,
  CheckCircle2,
  Image as ImageIcon,
  Lightbulb,
  Palette,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

// Must render per-request: lives inside the (taller) layout, which calls
// getCurrentProfile(). Static rendering would bake the unauthenticated
// redirect into the HTML and force a re-login for every visitor.
export const dynamic = 'force-dynamic'

export default function HelpPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-10">
      <header>
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
          Cómo usar
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">El Taller</h1>
        <p className="text-base text-zinc-600 mt-3 leading-relaxed">
          La idea es simple: tú escribes en una línea qué quieres mostrar,
          la AI te devuelve hooks, script, caption y hashtags listos para
          copiar a Instagram. Aquí está el flujo completo.
        </p>
      </header>

      <Step
        n={1}
        icon={<Palette size={18} />}
        title="Llena tu brand brief"
        body="La AI escribe en tu voz solo si conoce tu negocio. Mientras más detalle pongas en /brand (qué vendes, a quién, cómo le hablas, captions tuyos que han funcionado), más auténtico el output. Toma 5 minutos. Después puedes editar cuando quieras."
        cta={{ href: '/brand', label: 'Ir a brand brief →' }}
      />

      <Step
        n={2}
        icon={<Sparkles size={18} />}
        title="Genera contenido"
        body="En /studio escribes la idea en una oración. Escoge si quieres Reel, Carrusel o Static. Súbele una foto si tienes (la AI la mira para que el copy haga sentido con la imagen). Le das al botón y en unos segundos tienes el contenido completo."
        cta={{ href: '/studio', label: 'Ir al studio →' }}
        sub={[
          {
            icon: <Lightbulb size={14} />,
            text: 'No tienes que tener la idea perfecta — escribe medio crudo. La AI organiza.',
          },
          {
            icon: <ImageIcon size={14} />,
            text: 'Foto opcional. Si la subes, el caption hace referencia a lo que se ve.',
          },
          {
            icon: <Calendar size={14} />,
            text: 'Cambia la fecha para programarlo en otro día. Default es hoy.',
          },
        ]}
      />

      <Step
        n={3}
        icon={<RefreshCw size={18} />}
        title="Edita y regenera"
        body="Todo el output es editable directo en el calendario. Cambia un hook, ajusta el caption, añade hashtags. Si nada del output convence, el botón Regenerar pide otra versión usando la misma idea, fecha y foto."
        cta={{ href: '/calendar', label: 'Ver calendario →' }}
      />

      <Step
        n={4}
        icon={<CheckCircle2 size={18} />}
        title="Aprueba y publica"
        body="Cuando un post esté listo, márcalo como Aprobado. Ya en Instagram, copia caption + hashtags con el botón de copiar de cada campo y publica desde tu app. Cuando lo subas a IG, marca el post como Publicado para mantener el calendario al día."
        sub={[
          {
            icon: <CheckCircle2 size={14} />,
            text: 'El estatus es solo para tu organización — Draft → Aprobado → Publicado.',
          },
        ]}
      />

      <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">
          Tips que hacen la diferencia
        </h2>
        <ul className="space-y-2 text-sm text-zinc-700">
          <li>
            <strong className="text-zinc-900">Sé específico en la idea.</strong>{' '}
            “Promo de viernes 2x1 en blusas” da mejor output que “algo de viernes”.
          </li>
          <li>
            <strong className="text-zinc-900">Pega captions tuyos en el brief.</strong>{' '}
            La AI imita estilo cuando ve ejemplos reales.
          </li>
          <li>
            <strong className="text-zinc-900">Las fotos no tienen que ser perfectas.</strong>{' '}
            Una foto del producto en el mostrador funciona mejor que una stock photo.
          </li>
          <li>
            <strong className="text-zinc-900">Si algo sale genérico, regenera.</strong>{' '}
            La segunda toma casi siempre es más afilada.
          </li>
        </ul>
      </section>

      <section className="text-sm text-zinc-500 border-t border-zinc-100 pt-6">
        <p>
          ¿Atascado o algo no luce bien? Escríbele a Miguel —{' '}
          <a
            href="mailto:miguel@mcdesignspr.com"
            className="text-zinc-700 underline hover:text-zinc-900"
          >
            miguel@mcdesignspr.com
          </a>
          .
        </p>
      </section>
    </main>
  )
}

function Step({
  n,
  icon,
  title,
  body,
  cta,
  sub,
}: {
  n: number
  icon: React.ReactNode
  title: string
  body: string
  cta?: { href: string; label: string }
  sub?: { icon: React.ReactNode; text: string }[]
}) {
  return (
    <section className="flex gap-4">
      <div className="shrink-0 flex flex-col items-center gap-2">
        <div className="h-9 w-9 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-semibold">
          {n}
        </div>
      </div>
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-zinc-500">{icon}</span>
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        </div>
        <p className="text-sm text-zinc-600 leading-relaxed">{body}</p>
        {sub && sub.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {sub.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-zinc-500"
              >
                <span className="text-zinc-400 mt-0.5 shrink-0">{s.icon}</span>
                <span>{s.text}</span>
              </li>
            ))}
          </ul>
        )}
        {cta && (
          <Link
            href={cta.href}
            className="inline-flex items-center mt-3 text-sm font-medium text-zinc-900 hover:[color:var(--brand-accent)] transition-colors"
          >
            {cta.label}
          </Link>
        )}
      </div>
    </section>
  )
}
