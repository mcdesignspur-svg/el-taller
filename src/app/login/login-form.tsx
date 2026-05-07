'use client'

import { useActionState } from 'react'
import { sendMagicLink, type LoginState } from './actions'

const initialState: LoginState = { status: 'idle' }

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    sendMagicLink,
    initialState,
  )

  if (state.status === 'sent') {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center">
        <p className="text-zinc-900 font-medium mb-1">Revisa tu email</p>
        <p className="text-sm text-zinc-600">
          Te mandamos un enlace a <span className="font-medium">{state.email}</span> para
          entrar al Taller.
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-3">
      <input
        type="email"
        name="email"
        placeholder="tu@email.com"
        required
        autoComplete="email"
        className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 text-white px-4 py-3 text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 transition"
      >
        {pending ? 'Enviando…' : 'Enviar enlace'}
      </button>
      {state.status === 'error' && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
    </form>
  )
}
