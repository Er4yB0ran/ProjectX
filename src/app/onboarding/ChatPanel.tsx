'use client'

import { useState } from 'react'
import { DAY_NAMES } from '@/lib/skeletonBlock'
import type { ChatTurn } from './skeletonChatTypes'
import BudgetBanner from './BudgetBanner'

interface ChatPanelProps {
  turns: ChatTurn[]
  isSending: boolean
  error: string | null
  onSend: (text: string) => void
  sessionTotalTokens: number
  locked: boolean
}

export default function ChatPanel({ turns, isSending, error, onSend, sessionTotalTokens, locked }: ChatPanelProps) {
  const [input, setInput] = useState('')

  function handleSend() {
    const text = input.trim()
    if (!text || isSending || locked) return
    setInput('')
    onSend(text)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-4 border-b border-[#1e1e2a] shrink-0">
        <h3 className="text-sm font-semibold text-white">İskeleti Düzenle</h3>
        <p className="text-xs text-white/32 mt-0.5">
          Örn: &quot;spor saatini akşama al&quot;
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {turns.length === 0 && (
          <p className="text-xs text-white/22 text-center py-6">
            Taslağı buradan sohbet ederek düzenleyebilirsin.
          </p>
        )}
        {turns.map((turn) => (
          <div key={turn.id} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%]">
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                  turn.role === 'user'
                    ? 'bg-violet-600/25 border border-violet-500/35 text-violet-100'
                    : 'bg-[#14141e] border border-[#25253a] text-white/75'
                }`}
              >
                {turn.displayText}
              </div>
              {turn.ambiguousBlocks && turn.ambiguousBlocks.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {turn.ambiguousBlocks.map((b) => (
                    <button
                      key={b.client_id}
                      type="button"
                      onClick={() =>
                        onSend(
                          `Bahsettiğim blok: ${b.title} (${DAY_NAMES[b.day_of_week]} ${b.start_time.slice(0, 5)}-${b.end_time.slice(0, 5)})`
                        )
                      }
                      disabled={isSending || locked}
                      className="text-left text-xs px-3 py-2 rounded-xl border border-[#25253a] bg-[#0e0e16] text-white/60 hover:bg-[#181822] hover:text-white/85 hover:border-violet-500/30 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {b.title} — {DAY_NAMES[b.day_of_week]} {b.start_time.slice(0, 5)}-{b.end_time.slice(0, 5)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-3.5 py-2.5 text-sm bg-[#14141e] border border-[#25253a] text-white/40">
              Düşünüyor...
            </div>
          </div>
        )}
      </div>

      {error && <p className="px-4 pb-2 text-xs text-red-400/85 shrink-0">{error}</p>}

      <div className="shrink-0">
        <BudgetBanner sessionTotalTokens={sessionTotalTokens} />
        <div className="px-4 pb-4 border-t border-[#1e1e2a] pt-4">
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              disabled={isSending || locked}
              placeholder={locked ? 'Sohbet bütçesi doldu' : 'Bir mesaj yaz...'}
              className="flex-1 resize-none bg-[#0a0a0f] border border-[#25253a] text-white placeholder-white/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/15 transition-all duration-200 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || locked || !input.trim()}
              className="shrink-0 px-4 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-600 text-white text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Gönder
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
