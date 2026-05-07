// Admin — Miguel-only cross-tenant view. Phase 4:
//   - Bypass tenant scoping (uses createAdminClient)
//   - List all clients, usage_logs aggregated per tenant + month
//   - Add/edit clients, manage brand briefs, invite users

export default function AdminPage() {
  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-2">Admin · El Taller</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Phase 4 — panel cross-tenant para Miguel.
      </p>
      <div className="rounded-lg border-2 border-dashed border-zinc-200 p-12 text-center text-zinc-400 text-sm">
        Lista de clientes · usage por tenant · brand briefs · invitaciones
      </div>
    </main>
  )
}
