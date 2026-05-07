import Link from 'next/link'
import { headers } from 'next/headers'
import { resolveSlugFromHost, getTenantBySlug } from '@/lib/tenant'
import { getCurrentProfile } from '@/lib/dal'
import { signOut } from '@/lib/auth-actions'

// Shared layout for /studio and /calendar.
// Enforces auth (redirect → /login) and renders the tenant chrome.

export default async function TallerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await getCurrentProfile()

  const h = await headers()
  const slug = h.get('x-tenant-slug') ?? resolveSlugFromHost(h.get('host'))
  const tenant = slug ? await getTenantBySlug(slug) : null

  return (
    <div className="flex flex-col flex-1 min-h-full">
      <header className="border-b border-zinc-200 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="text-xs uppercase tracking-widest text-zinc-500">
            El Taller
          </span>
          {tenant && <span className="text-sm font-medium">{tenant.name}</span>}
        </div>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/studio" className="text-zinc-600 hover:text-zinc-900">
            Crear
          </Link>
          <Link href="/calendar" className="text-zinc-600 hover:text-zinc-900">
            Calendario
          </Link>
          <Link href="/brand" className="text-zinc-600 hover:text-zinc-900">
            Marca
          </Link>
          <span className="text-zinc-300">·</span>
          <span className="text-xs text-zinc-500 hidden sm:inline">{user.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs text-zinc-500 hover:text-zinc-900"
            >
              Salir
            </button>
          </form>
        </nav>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  )
}
