'use client'

import { useTransition, useOptimistic } from 'react'
import { updateTaskStatus, rescheduleTask } from './actions'
import type { Task, TaskStatus } from '@/types/supabase'

/**
 * Zaman Kilidi (Anti-Cheat) — Görevin başlangıç zamanı henüz gelmediyse `true` döner.
 *
 * Kural:
 *  - `start_time` varsa: `task_date + start_time` (yerel saat) > şu an → kilitli
 *  - `start_time` yoksa: `task_date` > bugünün tarihi → kilitli
 *    (Bugünün tarihindeki saat-bilgisiz görevler her zaman erişilebilirdir.)
 */
function isTimeLocked(taskDate: string, startTime: string | null): boolean {
  const now = new Date()

  if (startTime) {
    // "YYYY-MM-DDTHH:MM:SS" → yerel Date nesnesi
    const taskStart = new Date(`${taskDate}T${startTime}`)
    return taskStart > now
  }

  // Saat bilgisi yoksa yalnızca günü karşılaştır
  const todayStr = now.toLocaleDateString('sv-SE') // "YYYY-MM-DD" (ISO-like, yerel)
  return taskDate > todayStr
}

function cardStyle(status: TaskStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-white/50 border-green-300/40'
    case 'rescheduled':
      return 'bg-white/40 border-white/20 border-l-4 border-l-amber-400/50'
    case 'cancelled':
      return 'bg-white/20 border-gray-200/30 opacity-45'
    default:
      return 'bg-white/60 border-white/40'
  }
}

function StatusIcon({ status }: { status: TaskStatus }) {
  if (status === 'completed') return <span className="text-green-500 text-sm leading-none">✓</span>
  if (status === 'rescheduled') return <span className="text-amber-500 text-sm leading-none">↷</span>
  if (status === 'cancelled') return <span className="text-gray-400 text-sm leading-none">✕</span>
  return null
}

interface ActionButtonProps {
  label: string
  onClick: () => void
  disabled: boolean
  active: boolean
  variant: 'green' | 'amber' | 'red'
}

function ActionButton({ label, onClick, disabled, active, variant }: ActionButtonProps) {
  const base = 'text-xs px-2.5 py-1 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50'
  const colors = {
    green: active
      ? 'bg-green-100 text-green-700 border-green-300'
      : 'text-gray-500 border-transparent hover:bg-green-50 hover:text-green-700',
    amber: active
      ? 'bg-amber-100 text-amber-700 border-amber-300'
      : 'text-gray-500 border-transparent hover:bg-amber-50 hover:text-amber-700',
    red: active
      ? 'bg-red-50 text-red-600 border-red-200'
      : 'text-gray-500 border-transparent hover:bg-red-50 hover:text-red-600',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || active}
      className={`${base} ${colors[variant]}`}
    >
      {label}
    </button>
  )
}

export default function TaskCard({ task, isFixed }: { task: Task; isFixed: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(task.status)

  function handleStatus(status: TaskStatus) {
    startTransition(async () => {
      setOptimisticStatus(status)
      await updateTaskStatus(task.id, status)
    })
  }

  function handleReschedule() {
    startTransition(async () => {
      setOptimisticStatus('rescheduled')
      await rescheduleTask(task.id)
    })
  }

  const isCancelled = optimisticStatus === 'cancelled'

  // Zaman Kilidi: görevin başlangıç zamanı henüz gelmediyse butonlar pasif kalır
  const timeLocked = isTimeLocked(task.task_date, task.start_time)

  return (
    <div
      className={`rounded-2xl border backdrop-blur-sm px-4 py-3.5 transition-all duration-300 ${cardStyle(optimisticStatus)}`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Sol: başlık + saat */}
        <div className="flex items-start gap-2 min-w-0">
          <div className="mt-0.5 shrink-0 w-4">
            <StatusIcon status={optimisticStatus} />
          </div>
          <div className="min-w-0">
            <p
              className={`text-sm font-medium leading-snug truncate ${
                isCancelled
                  ? 'line-through text-gray-400'
                  : optimisticStatus === 'completed'
                  ? 'text-gray-500'
                  : 'text-gray-800'
              }`}
            >
              {task.title}
            </p>
            {task.start_time && (
              <p className="text-xs text-gray-400 mt-0.5">
                {task.start_time.slice(0, 5)}
                {task.end_time ? ` – ${task.end_time.slice(0, 5)}` : ''}
                {optimisticStatus === 'rescheduled' && (
                  <span className="ml-1.5 text-amber-400/40 text-[11px]">↺</span>
                )}
              </p>
            )}
            {!task.start_time && optimisticStatus === 'rescheduled' && (
              <span className="text-[10px] text-amber-400/40 leading-none mt-0.5 block">↺</span>
            )}
          </div>
        </div>

        {/* Sağ: aksiyon butonları */}
        {!isCancelled && (
          <div className="flex items-center gap-1.5 shrink-0">
            {timeLocked ? (
              /* Zaman Kilidi: görevin saati henüz gelmedi */
              <span
                title="Bu görevin saati henüz gelmedi"
                className="text-xs text-gray-300 select-none px-1"
                aria-label="Görev kilitli — saati bekleniyor"
              >
                🔒
              </span>
            ) : (
              <>
                <ActionButton
                  label="Yaptım"
                  onClick={() => handleStatus('completed')}
                  disabled={isPending}
                  active={optimisticStatus === 'completed'}
                  variant="green"
                />
                {!isFixed && (
                  <ActionButton
                    label="Erteledim"
                    onClick={handleReschedule}
                    disabled={isPending}
                    active={optimisticStatus === 'rescheduled'}
                    variant="amber"
                  />
                )}
                <ActionButton
                  label="Olmadı"
                  onClick={() => handleStatus('cancelled')}
                  disabled={isPending}
                  active={false}
                  variant="red"
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
