// Calendar — month grid view of all content_items for the tenant.
// Phase 3 wires this up: server-rendered grid, click → modal with output,
// edit/delete, status toggle (draft → approved → published).

export default function CalendarPage() {
  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-2">Calendario</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Phase 3 — esto se llena en la próxima sesión.
      </p>
      <div className="rounded-lg border-2 border-dashed border-zinc-200 p-12 text-center text-zinc-400 text-sm">
        Month grid · click día → ver/editar contenido
      </div>
    </main>
  )
}
