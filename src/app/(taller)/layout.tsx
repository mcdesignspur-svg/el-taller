import Link from 'next/link'
import { headers } from 'next/headers'
import { resolveSlugFromHost, getTenantBySlug } from '@/lib/tenant'
import { getCurrentProfile } from '@/lib/dal'
import { signOut } from '@/lib/auth-actions'
import { createServerClient } from '@/lib/supabase/server'
import { getBrandBrief } from '@/lib/brand-brief'
import { extractHexColor, getLogoSignedUrl } from '@/lib/branding'

// Shared layout for /studio and /calendar.
// Enforces auth (redirect → /login) and renders the tenant chrome.

export default async function TallerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = await getCurrentProfile()

  const h = await headers()
  const slug = h.get('x-tenant-slug') ?? resolveSlugFromHost(h.get('host'))
  const tenant = slug ? await getTenantBySlug(slug) : null

  const supabase = await createServerClient()
  const brief = await getBrandBrief(supabase, profile.client_id)

  // Brand colors and logo come from brand_briefs. The free-form text fields
  // double as AI brief context (so "terracotta / #B45A3C" stays intact);
  // here we extract just the hex for CSS application.
  const brandAccent = extractHexColor(brief?.primary_color) ?? '#18181b'
  const brandSecondary = extractHexColor(brief?.secondary_color) ?? '#71717a'
  const logoUrl = await getLogoSignedUrl(supabase, brief?.logo_url ?? null)

  return (
    <div
      className="flex flex-col flex-1 min-h-full"
      style={{
        ['--brand-accent' as string]: brandAccent,
        ['--brand-secondary' as string]: brandSecondary,
      }}
    >
      <header className="border-b border-zinc-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={tenant?.name ?? 'Logo'}
              className="h-8 w-auto max-w-[140px] object-contain"
            />
          ) : (
            <>
              <span className="text-xs uppercase tracking-widest text-zinc-500 hidden sm:inline">
                El Taller
              </span>
              {tenant && (
                <span className="text-base font-semibold text-zinc-900 truncate">
                  {tenant.name}
                </span>
              )}
            </>
          )}
        </div>
        <nav className="flex items-center gap-5 text-sm">
          <Link
            href="/studio"
            className="text-zinc-600 hover:[color:var(--brand-accent)] transition-colors"
          >
            Crear
          </Link>
          <Link
            href="/calendar"
            className="text-zinc-600 hover:[color:var(--brand-accent)] transition-colors"
          >
            Calendario
          </Link>
          <Link
            href="/brand"
            className="text-zinc-600 hover:[color:var(--brand-accent)] transition-colors"
          >
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
