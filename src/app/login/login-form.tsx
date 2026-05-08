'use client'

import { useActionState } from 'react'
import { signIn, type LoginState } from './actions'

const initialState: LoginState = { status: 'idle' }

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    signIn,
    initialState,
  )

  return (
    <form action={action} className="space-y-3">
      <div>
        <label
          htmlFor="email"
          className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          name="email"
          placeholder="tu@email.com"
          required
          autoComplete="email"
          autoFocus
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5"
        >
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          name="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 text-white px-4 py-3 text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 transition"
      >
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
      {state.status === 'error' && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
    </form>
  )
}
