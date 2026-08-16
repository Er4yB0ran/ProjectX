'use client'

import { useState, useTransition } from 'react'
import { generateSkeletonSuggestions, acceptSuggestion, dismissSuggestion } from './actions'

export interface SuggestionWithBlockTitle {
  id: string
  field: string
  current_value: string
  suggested_value: string
  rationale: string
  blockTitle: string
}

const DAY_NAMES: Record<string, string> = {
  '0': 'Pazartesi',
  '1': 'Salı',
  '2': 'Çarşamba',
  '3': 'Perşembe',
  '4': 'Cuma',
  '5': 'Cumartesi',
  '6': 'Pazar',
}

const FIELD_LABELS: Record<string, string> = {
  day_of_week: 'Gün',
  start_time: 'Başlangıç saati',
  end_time: 'Bitiş saati',
}

function formatValue(field: string, value: string): string {
  if (field === 'day_of_week') return DAY_NAMES[value] ?? value
  return value.slice(0, 5)
}

/** generateSkeletonSuggestions'in "az veri" hatasi bir basarisizlik degil, bilgilendirme —
 *  bu yuzden kirmizi degil notr renkte gosterilir. */
function isInsufficientDataError(message: string): boolean {
  return message.includes('yeterli veri') || message.includes('esnek bir blok')
}

export default function SuggestionsPanel({ suggestions }: { suggestions: SuggestionWithBlockTitle[] }) {
  const [isPending, startTransition] = useTransition()
  const [actingId, setActingId] = useState<string | null>(null)
  const [generateNotice, setGenerateNotice] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function handleGenerate() {
    setGenerateNotice(null)
    setGenerateError(null)
    startTransition(async () => {
      try {
        await generateSkeletonSuggestions()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Öneriler oluşturulamadı'
        if (isInsufficientDataError(message)) {
          setGenerateNotice(message)
        } else {
          setGenerateError(message)
        }
      }
    })
  }

  function handleAccept(id: string) {
    setActingId(id)
    setActionError(null)
    startTransition(async () => {
      try {
        await acceptSuggestion(id)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Öneri kabul edilemedi')
      } finally {
        setActingId(null)
      }
    })
  }

  function handleDismiss(id: string) {
    setActingId(id)
    setActionError(null)
    startTransition(async () => {
      try {
        await dismissSuggestion(id)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Öneri reddedilemedi')
      } finally {
        setActingId(null)
      }
    })
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-neutral-300">Şablon önerileri</h2>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending && actingId === null ? 'Oluşturuluyor…' : 'Öneri oluştur'}
        </button>
      </div>

      {generateNotice && (
        <div className="flex items-start gap-2 rounded-lg px-3 py-2 mb-3 bg-neutral-800 border border-neutral-700">
          <p className="text-xs text-neutral-400">{generateNotice}</p>
        </div>
      )}

      {generateError && (
        <div className="flex items-start gap-2 rounded-lg px-3 py-2 mb-3 bg-red-500/10 border border-red-500/25">
          <span className="text-red-400 mt-0.5 shrink-0 text-xs">!</span>
          <p className="text-xs text-red-400/85">{generateError}</p>
        </div>
      )}

      {actionError && (
        <div className="flex items-start gap-2 rounded-lg px-3 py-2 mb-3 bg-red-500/10 border border-red-500/25">
          <span className="text-red-400 mt-0.5 shrink-0 text-xs">!</span>
          <p className="text-xs text-red-400/85">{actionError}</p>
        </div>
      )}

      {suggestions.length === 0 ? (
        <p className="text-sm text-neutral-600">
          Bekleyen öneri yok. Yeni öneriler için &quot;Öneri oluştur&quot;a tıklayın.
        </p>
      ) : (
        <div className="space-y-1.5">
          {suggestions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{s.blockTitle}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {FIELD_LABELS[s.field] ?? s.field}: {formatValue(s.field, s.current_value)} →{' '}
                  {formatValue(s.field, s.suggested_value)}
                </p>
                <p className="text-xs text-neutral-600 mt-1">{s.rationale}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleAccept(s.id)}
                  disabled={isPending}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending && actingId === s.id ? '…' : 'Kabul et'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDismiss(s.id)}
                  disabled={isPending}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reddet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
