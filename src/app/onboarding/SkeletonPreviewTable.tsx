'use client'

import { DAY_NAMES, groupBlocksByDay } from '@/lib/skeletonBlock'
import type { DraftBlock } from './skeletonChatTypes'

const DAY_COLORS = [
  'text-blue-400   bg-blue-500/10   border border-blue-500/25',
  'text-indigo-400 bg-indigo-500/10 border border-indigo-500/25',
  'text-violet-400 bg-violet-500/10 border border-violet-500/25',
  'text-purple-400 bg-purple-500/10 border border-purple-500/25',
  'text-pink-400   bg-pink-500/10   border border-pink-500/25',
  'text-rose-400   bg-rose-500/10   border border-rose-500/25',
  'text-amber-400  bg-amber-500/10  border border-amber-500/25',
] as const

interface SkeletonPreviewTableProps {
  blocks: DraftBlock[]
}

export default function SkeletonPreviewTable({ blocks }: SkeletonPreviewTableProps) {
  const blocksByDay = groupBlocksByDay(blocks)

  return (
    <div className="space-y-3">
      {DAY_NAMES.map((dayName, dayIndex) => {
        const dayBlocks = blocksByDay[dayIndex]
        const colorClass = DAY_COLORS[dayIndex]

        return (
          <div
            key={dayIndex}
            className="backdrop-blur-md rounded-2xl p-4"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colorClass}`}>
                {dayName}
              </span>
              <span className="text-xs text-white/22">
                {dayBlocks.length > 0 ? `${dayBlocks.length} blok` : 'boş'}
              </span>
            </div>

            {dayBlocks.length > 0 ? (
              <div className="space-y-2">
                {dayBlocks.map((block) => (
                  <div
                    key={block.client_id}
                    className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      borderColor: 'rgba(255,255,255,0.10)',
                    }}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      {block.is_hard_constraint && (
                        <span
                          title="Sabit görev — ertelenemez"
                          className="shrink-0 mt-0.5 text-[10px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-1 py-0.5 rounded select-none"
                        >
                          SABİT
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate leading-snug">
                          {block.title}
                        </p>
                        <p className="text-xs text-white/30 mt-0.5 font-mono tabular-nums">
                          {block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:flex items-center text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded tabular-nums">
                        E {block.energy_cost}
                      </span>
                      <span className="hidden sm:flex items-center text-[10px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded tabular-nums">
                        F {block.flexibility_score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/18 pl-1">Bu gün için blok yok</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
