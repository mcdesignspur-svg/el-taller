'use client'

import { useActionState, useState } from 'react'
import { createTenantAndUser, type CreateTenantUserState } from './actions'

const initialState: CreateTenantUserState = { status: 'idle' }

export function CreateTenantForm() {
  const [state, action, pending] = useActionState<
    CreateTenantUserState,
    FormData
  >(createTenantAndUser, initialState)
  const [open, setOpen] = useState(false)

  if (!open && state.status !== 'success') {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-zinc-300 px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        + Nuevo tenant
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-900">
          Crear tenant + usuario
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 hover:text-zinc-900"
        >
          Cerrar
        </button>
      </div>

      {state.status === 'success' ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
          <p className="font-medium text-emerald-900">
            ✓ {state.tenantName} creado
          </p>
          <p className="text-emerald-800 mt-1">
            Usuario <span className="font-mono">{state.email}</span> ya puede
            entrar a <span className="font-mono">/login</span>. Slug:{' '}
            <span className="font-mono">{state.tenantSlug}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              window.location.reload()
            }}
            className="mt-3 text-xs text-emerald-900 underline"
          >
            Crear otro
          </button>
        </div>
      ) : (
        <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Nombre del cliente
            </label>
            <input
              name="tenantName"
              type="text"
              placeholder="Acme Studio"
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Slug (opcional)
            </label>
            <input
              name="slug"
              type="text"
              placeholder="acme-studio"
              pattern="[a-z0-9-]+"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Email del owner
            </label>
            <input
              name="email"
              type="email"
              placeholder="dueno@cliente.com"
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Contraseña inicial
            </label>
            <input
              name="password"
              type="text"
              placeholder="mínimo 8 caracteres"
              required
              minLength={8}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Compártela con el cliente. Puede cambiarla después.
            </p>
          </div>
          <div className="sm:col-span-2 flex items-center justify-between gap-3 pt-1">
            {state.status === 'error' ? (
              <p className="text-xs text-red-600">{state.message}</p>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-zinc-900 text-white px-4 py-2 text-xs font-medium hover:bg-zinc-800 disabled:opacity-50"
            >
              {pending ? 'Creando…' : 'Crear tenant + usuario'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
