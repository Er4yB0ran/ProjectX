'use client'

import { useState } from 'react'
import SkeletonPreviewTable from './SkeletonPreviewTable'
import ChatPanel from './ChatPanel'
import {
  applyPatch,
  summarizePatch,
  type ChatTurn,
  type DraftBlock,
  type EditSkeletonApiResponse,
} from './skeletonChatTypes'
import { AI_CHAT_TOKEN_BUDGET } from '@/lib/aiChatConfig'

interface SkeletonChatEditorProps {
  initialBlocks: DraftBlock[]
  committing: boolean
  error: string | null
  onContinue: (blocks: DraftBlock[]) => void
}

export default function SkeletonChatEditor({ initialBlocks, committing, error, onContinue }: SkeletonChatEditorProps) {
  const [sessionId] = useState(() => crypto.randomUUID())
  const [blocks, setBlocks] = useState<DraftBlock[]>(initialBlocks)
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [rawTurns, setRawTurns] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [isSending, setIsSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [sessionTotalTokens, setSessionTotalTokens] = useState(0)
  const [locked, setLocked] = useState(false)

  async function handleSend(text: string) {
    if (isSending || locked) return
    setIsSending(true)
    setChatError(null)
    setTurns((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', displayText: text }])

    try {
      const res = await fetch('/api/onboarding/edit-skeleton', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, blocks, turns: rawTurns, message: text }),
      })
      const json: EditSkeletonApiResponse = await res.json()

      if (json.status === 'budget_exceeded') {
        setSessionTotalTokens(json.sessionTotalTokens)
        setLocked(true)
        return
      }
      if (json.status === 'error') {
        setChatError(json.message ?? 'Bir hata oluştu, lütfen tekrar deneyin.')
        return
      }

      setSessionTotalTokens(json.sessionTotalTokens)
      if (json.sessionTotalTokens >= AI_CHAT_TOKEN_BUDGET) setLocked(true)

      const data = json.data
      setRawTurns((prev) => [...prev, { role: 'user', content: text }, { role: 'assistant', content: JSON.stringify(data) }])

      if (!data.is_relevant) {
        setTurns((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', displayText: data.rejection_reason || 'Bu istek iskeletle ilgili değil.' },
        ])
      } else if (data.needs_clarification) {
        const candidates = blocks.filter((b) => data.ambiguous_block_ids.includes(b.client_id))
        setTurns((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            displayText: data.clarification_question || 'Hangi bloğu kastettin?',
            ambiguousBlocks: candidates,
          },
        ])
      } else {
        setBlocks((prev) => applyPatch(prev, data.patch))
        setTurns((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', displayText: summarizePatch(data.patch) }])
      }
    } catch {
      setChatError('Bağlantı hatası, lütfen tekrar deneyin.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#07070a' }}>
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(109,40,217,0.07) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 flex-1 flex min-h-0 overflow-hidden">
        <div className="w-1/4 min-w-[280px] border-r border-[#1e1e2a] flex flex-col min-h-0">
          <ChatPanel
            turns={turns}
            isSending={isSending}
            error={chatError}
            onSend={handleSend}
            sessionTotalTokens={sessionTotalTokens}
            locked={locked}
          />
        </div>

        <div className="w-3/4 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 sm:px-10 pt-6 sm:pt-10 shrink-0">
            <h2 className="text-xl font-semibold text-white mb-1 tracking-tight">Haftalık İskeletin</h2>
            <p className="text-white/32 text-sm mb-6">Sohbetle düzenle, hazır olduğunda devam et.</p>
            {error && <p className="mb-4 text-red-400/85 text-sm">{error}</p>}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-10 pb-6">
            <SkeletonPreviewTable blocks={blocks} />
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-[#1e1e2a] p-4 sm:p-6" style={{ background: '#0d0d12' }}>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onContinue(blocks)}
            disabled={committing}
            className="px-8 py-3 rounded-2xl bg-violet-700 hover:bg-violet-600 text-white font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{ boxShadow: '0 0 24px rgba(109,40,217,0.28), 0 1px 4px rgba(0,0,0,0.5)' }}
          >
            {committing ? 'Kaydediliyor...' : 'Devam et'}
          </button>
        </div>
      </div>
    </div>
  )
}
