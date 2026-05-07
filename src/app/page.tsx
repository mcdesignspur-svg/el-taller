import Link from 'next/link'
import { headers } from 'next/headers'
import { resolveSlugFromHost, getTenantBySlug } from '@/lib/tenant'

// Marketing landing on studio.mcdesignspr.com.
// On a tenant subdomain (e.g. studio.beboutiquepr.com), the proxy sets
// `x-tenant-slug` and we redirect into the studio shell instead.
export default async function Home() {
  const h = await headers()
  const host = h.get('host')
  const slug = resolveSlugFromHost(host)

  if (slug && slug !== 'demo') {
    const tenant = await getTenantBySlug(slug)
    if (tenant?.is_active) {
      // Tenant subdomain → send straight into the studio.
      // (Login gate happens inside the studio layout.)
      return (
        <main className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            <p className="text-sm text-zinc-500 mb-4">El Taller — {tenant.name}</p>
            <Link
              href="/studio"
              className="inline-flex items-center justify-center rounded-full bg-zinc-900 text-white px-6 py-3 text-sm font-medium"
            >
              Entrar al Taller
            </Link>
          </div>
        </main>
      )
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8 max-w-3xl mx-auto text-center gap-6">
      <p className="text-xs uppercase tracking-widest text-zinc-500">MC Designs</p>
      <h1 className="text-5xl font-semibold tracking-tight">El Taller</h1>
      <p className="text-lg text-zinc-600 max-w-xl">
        AI content studio para negocios en Puerto Rico. Sube una foto, escribe la idea,
        escoge la fecha — y deja que la AI te entregue Reels, Carruseles y Statics
        listos para postear.
      </p>
      <div className="flex gap-3 mt-4">
        <Link
          href="/studio"
          className="inline-flex items-center rounded-full bg-zinc-900 text-white px-5 py-2.5 text-sm font-medium"
        >
          Probar el demo
        </Link>
        <a
          href="https://mcdesignspr.com/talk"
          className="inline-flex items-center rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-zinc-50"
        >
          Quiero uno para mi negocio
        </a>
      </div>
    </main>
  )
}
