// Login — magic-link auth via Supabase. Phase 1 wires this up:
//   - Email input → supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })
//   - Success state → "Revisa tu email"
//   - Callback at /auth/callback exchanges the code for a session

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-2">Entrar al Taller</h1>
        <p className="text-sm text-zinc-500 mb-6">
          Phase 1 — magic link form va aquí.
        </p>
        <div className="rounded-lg border-2 border-dashed border-zinc-200 p-8 text-center text-zinc-400 text-sm">
          Email input + botón "Enviar enlace"
        </div>
      </div>
    </main>
  )
}
