import Link from 'next/link'
import { headers } from 'next/headers'
import { resolveSlugFromHost, getTenantBySlug } from '@/lib/tenant'

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const h = await headers()
  const slug = h.get('x-tenant-slug') ?? resolveSlugFromHost(h.get('host'))
  const tenant = slug ? await getTenantBySlug(slug) : null

  return (
    <div className="flex flex-col flex-1 min-h-full">
      <header className="border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <span className="text-xs uppercase tracking-widest text-zinc-500">
            El Taller
          </span>
          {tenant && <span className="text-sm font-medium">{tenant.name}</span>}
        </div>
        <nav className="flex gap-4 text-sm">
          <Link href="/studio" className="hover:text-zinc-900 text-zinc-600">
            Crear
          </Link>
          <Link href="/calendar" className="hover:text-zinc-900 text-zinc-600">
            Calendario
          </Link>
        </nav>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  )
}
