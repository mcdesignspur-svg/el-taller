'use client'

// Global error boundary. Must define its own <html> and <body> because it
// replaces the root layout when active. Next.js 16 expects `unstable_retry`
// (renamed from `reset`).

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html lang="es">
      <body className="min-h-screen flex items-center justify-center bg-white text-zinc-900 font-sans">
        <div className="max-w-md text-center p-8">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">
            El Taller
          </p>
          <h1 className="text-2xl font-semibold mb-2">Algo salió mal</h1>
          <p className="text-sm text-zinc-600 mb-6">
            Hubo un error inesperado. Intenta de nuevo o vuelve más tarde.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-lg bg-zinc-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-800"
          >
            Volver a intentar
          </button>
        </div>
      </body>
    </html>
  )
}
