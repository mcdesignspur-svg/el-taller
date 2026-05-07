import { Suspense } from 'react'
import { headers } from 'next/headers'
import { resolveSlugFromHost, getTenantBySlug } from '@/lib/tenant'
import { LoginForm } from './login-form'

const ERROR_MESSAGES: Record<string, string> = {
  no_code: 'El enlace no trae código. Pide uno nuevo.',
  exchange_failed: 'El enlace expiró o ya se usó. Pide uno nuevo.',
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

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-widest text-zinc-500">El Taller</p>
          {tenant && (
            <p className="text-lg font-medium mt-1">{tenant.name}</p>
          )}
        </div>
        <h1 className="text-2xl font-semibold mb-2">Entrar</h1>
        <p className="text-sm text-zinc-500 mb-6">
          Te mando un enlace por email — sin password.
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
