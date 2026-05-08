import { Suspense } from 'react'
import { headers } from 'next/headers'
import { resolveSlugFromHost, getTenantBySlug } from '@/lib/tenant'
import { createAdminClient } from '@/lib/supabase/server'
import { getLogoSignedUrl } from '@/lib/branding'
import { LoginForm } from './login-form'

const ERROR_MESSAGES: Record<string, string> = {
  // Magic-link / password-reset callback errors. Kept here because Supabase
  // password-reset emails still go through /auth/callback.
  no_code: 'El enlace no trae código. Pídele a Miguel uno nuevo.',
  exchange_failed: 'El enlace expiró o ya se usó. Pídele a Miguel uno nuevo.',
  no_tenant: 'No pude identificar el negocio para este dominio.',
  tenant_not_found: 'El tenant no existe en la base de datos.',
  no_profile: 'Tu cuenta no tiene un perfil asignado todavía.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error ? ERROR_MESSAGES[error] ?? null : null

  const h = await headers()
  const slug = h.get('x-tenant-slug') ?? resolveSlugFromHost(h.get('host'))
  const tenant = slug ? await getTenantBySlug(slug) : null

  // Pull the tenant's logo so the login screen feels like their studio,
  // not a generic El Taller page. Anonymous user — has to use admin client
  // to read brand_briefs and to sign the storage URL.
  let logoUrl: string | null = null
  if (tenant) {
    try {
      const admin = createAdminClient()
      const { data: brief } = await admin
        .from('brand_briefs')
        .select('logo_url')
        .eq('client_id', tenant.id)
        .maybeSingle()
      logoUrl = await getLogoSignedUrl(admin, brief?.logo_url ?? null)
    } catch {
      logoUrl = null
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {logoUrl ? (
            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={tenant?.name ?? 'Logo'}
                className="h-12 w-auto max-w-[200px] object-contain"
              />
              <p className="text-[10px] uppercase tracking-widest text-zinc-400">
                El Taller
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs uppercase tracking-widest text-zinc-500">El Taller</p>
              {tenant && (
                <p className="text-lg font-medium mt-1">{tenant.name}</p>
              )}
            </>
          )}
        </div>
        <h1 className="text-2xl font-semibold mb-2">Entrar</h1>
        <p className="text-sm text-zinc-500 mb-6">
          Usa el email y contraseña que te dio Miguel.
        </p>
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
