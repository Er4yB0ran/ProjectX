'use client'

import { useState, useTransition } from 'react'
import { closeDayAndReflect } from './actions'

interface Props {
  existingMessage: string | null
}

export default function CloseDay({ existingMessage }: Props) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(existingMessage)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await closeDayAndReflect()
        setMessage(result.ai_message)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bir hata olustu')
      }
    })
  }

  if (message) {
    return (
      <div className="mt-8 bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-4">
        <p className="text-xs text-neutral-500 uppercase tracking-widest mb-3">Gunun Ozeti</p>
        <p className="text-sm text-neutral-300 leading-relaxed">{message}</p>
      </div>
    )
  }

  return (
    <div className="mt-8">
      {error && (
        <p className="text-xs text-red-400 mb-2">{error}</p>
      )}
      <button
        onClick={handleClose}
        disabled={isPending}
        className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-sm rounded-xl px-4 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Ozet Hazirlaniyor...' : 'Gunu Kapat'}
      </button>
    </div>
  )
}
