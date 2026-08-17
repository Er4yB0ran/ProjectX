'use client'

import { useState, useTransition } from 'react'
import { toggleAiChatEnabled } from './actions'

interface AiChatConfigCardProps {
  initialEnabled: boolean
}

export default function AiChatConfigCard({ initialEnabled }: AiChatConfigCardProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    startTransition(async () => {
      try {
        await toggleAiChatEnabled(next)
      } catch {
        setEnabled(!next)
      }
    })
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-6 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-white">Onboarding AI Sohbet Özelliği</p>
        <p className="text-xs text-neutral-500 mt-0.5">
          Açıkken kullanıcılar iskeletlerini sohbet ile düzenleyebilir. Kapalıyken onboarding bugünkü gibi çalışır.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={handleToggle}
        disabled={isPending}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 cursor-pointer shrink-0 ml-4 ${
          isPending ? 'opacity-40 cursor-not-allowed' : ''
        }`}
        style={{
          background: enabled ? 'rgba(139,92,246,0.75)' : 'rgba(255,255,255,0.10)',
          boxShadow: enabled ? '0 0 14px rgba(139,92,246,0.3)' : 'none',
        }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-sm transition-all duration-300 ${
            enabled ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white/75'
          }`}
        />
      </button>
    </div>
  )
}
