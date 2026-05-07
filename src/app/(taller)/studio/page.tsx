// Studio — main create surface. Phase 2 wires this up:
//   - Date picker (top)
//   - Idea textarea (center)
//   - Type selector: Reel | Carousel | Static (bottom)
//   - Photo upload (optional, sent to Claude Vision)
//   - Generate button → POST /api/generate → render output → save draft

export default function StudioPage() {
  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-2">Crear contenido</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Phase 2 — esto se llena en la próxima sesión.
      </p>
      <div className="rounded-lg border-2 border-dashed border-zinc-200 p-12 text-center text-zinc-400 text-sm">
        Prompt box + date picker + type selector + photo upload
      </div>
    </main>
  )
}
