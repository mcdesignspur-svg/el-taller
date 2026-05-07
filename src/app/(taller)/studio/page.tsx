import { StudioForm } from './studio-form'

export default function StudioPage() {
  return (
    <main className="min-h-[calc(100vh-65px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <StudioForm />
      </div>
    </main>
  )
}
