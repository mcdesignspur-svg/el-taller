import { exitImpersonation } from '@/app/admin/actions'

export function ImpersonationBanner({ tenantName }: { tenantName: string }) {
  return (
    <div className="bg-amber-100 border-b border-amber-300 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-block h-2 w-2 rounded-full bg-amber-500 shrink-0" />
        <span className="text-amber-900 truncate">
          Viendo como{' '}
          <span className="font-semibold">{tenantName}</span> (super admin)
        </span>
      </div>
      <form action={exitImpersonation}>
        <button
          type="submit"
          className="text-xs font-medium text-amber-900 hover:text-amber-950 underline whitespace-nowrap"
        >
          Volver a admin
        </button>
      </form>
    </div>
  )
}
