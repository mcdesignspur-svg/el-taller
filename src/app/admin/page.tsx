import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/lib/auth-actions'
import { getCurrentProfile, ACTING_AS_COOKIE } from '@/lib/dal'
import { listAllTenants } from '@/lib/tenant'
import { enterAsTenant } from './actions'

export const dynamic = 'force-dynamic'

// Admin · cross-tenant view for super admins (MC Designs).
// Lists every active tenant and lets the admin "enter as" any of them —
// brand brief, calendar, studio chrome all switch to the chosen tenant.

export default async function AdminPage() {
  const { user, profile } = await getCurrentProfile()
  if (!profile.is_super_admin) redirect('/studio')

  const tenants = await listAllTenants()
  const cookieStore = await cookies()
  const activeId = cookieStore.get(ACTING_AS_COOKIE)?.value ?? null

  return (
    <div className="min-h-full">
      <header className="border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            El Taller · Admin
          </p>
          <h1 className="text-lg font-semibold text-zinc-900">Tenants</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-xs text-zinc-500">{user.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs text-zinc-500 hover:text-zinc-900"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-sm text-zinc-500 mb-6">
          Selecciona un tenant para entrar a su studio. Editas brand brief,
          generas contenido o revisas el calendario como si fueras ese cliente.
          Tu propio profile no se mueve — la sesión se etiqueta como super
          admin y se desactiva al cerrar.
        </p>

        <div className="rounded-xl border border-zinc-200 divide-y divide-zinc-200 overflow-hidden">
          {tenants.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-zinc-500">
              No hay tenants activos.
            </div>
          )}
          {tenants.map((t) => {
            const isActive = activeId === t.id
            return (
              <div
                key={t.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-zinc-900">
                      {t.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono">
                      {t.slug}
                    </span>
                    {t.id === profile.client_id && !profile.is_synthetic && (
                      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-600">
                        Tu tenant
                      </span>
                    )}
                    {isActive && (
                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-amber-800">
                        Sesión activa
                      </span>
                    )}
                  </div>
                  {t.domain && (
                    <p className="text-xs text-zinc-500 mt-0.5">{t.domain}</p>
                  )}
                </div>
                <form action={enterAsTenant}>
                  <input type="hidden" name="client_id" value={t.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-zinc-900 text-white px-3.5 py-1.5 text-xs font-medium hover:bg-zinc-800"
                  >
                    Entrar
                  </button>
                </form>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-zinc-400 mt-6">
          La cookie de impersonación expira en 8 horas. Toda actividad bypassa
          RLS — usa con cuidado.{' '}
          <Link href="/studio" className="underline hover:text-zinc-600">
            Ir directo a tu studio
          </Link>
          .
        </p>
      </main>
    </div>
  )
}
