import { StudioForm } from './studio-form'

export default function StudioPage() {
  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-2">Crear contenido</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Sube una foto, escribe la idea, escoge fecha y tipo. La AI lo entrega listo
        para postear.
      </p>
      <StudioForm />
    </main>
  )
}
