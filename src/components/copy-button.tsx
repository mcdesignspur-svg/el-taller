'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

type Props = {
  text: string
  label?: string
  size?: 'sm' | 'md'
}

export function CopyButton({ text, label = 'Copiar', size = 'sm' }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Older browsers / non-secure contexts: fall back to a hidden textarea.
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      } catch {
        // give up silently
      } finally {
        document.body.removeChild(ta)
      }
    }
  }

  const dim = size === 'sm' ? 12 : 14
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1'

  return (
    <button
      type="button"
      onClick={handleClick}
      title={label}
      className={`inline-flex items-center gap-1 rounded text-xs ${padding} ${
        copied
          ? 'text-emerald-700'
          : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
      } transition`}
    >
      {copied ? <Check size={dim} /> : <Copy size={dim} />}
      <span>{copied ? 'Copiado' : label}</span>
    </button>
  )
}
