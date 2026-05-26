'use client'

import { useTransition, useOptimistic } from 'react'
import { updateTaskStatus, rescheduleTask } from './actions'
import type { Task, TaskStatus } from '@/types/supabase'

/**
 * Zaman Kilidi (Anti-Cheat) — Gorevin baslangic zamani henuz gelmediyse true doner.
 *
 * Kural:
 *  - start_time varsa: task_date + start_time (yerel saat) > su an -> kilitli
 *  - start_time yoksa: task_date > bugunun tarihi -> kilitli
 *    (Bugunun tarihindeki saat-bilgisiz gorevler her zaman erisebilirdir.)
 */
function isTimeLocked(taskDate: string, startTime: string | null): boolean {
  const now = new Date()

  if (startTime) {
    const taskStart = new Date(`${taskDate}T${startTime}`)
    return taskStart > now
  }

  const todayStr = now.toLocaleDateString('sv-SE')
  return taskDate > todayStr
}

function cardStyle(status: TaskStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-neutral-900 border border-neutral-800'
    case 'rescheduled':
      return 'bg-neutral-900 border-y border-r border-neutral-800 border-l-4 border-l-amber-500/50'
    case 'cancelled':
      return 'bg-neutral-900 border border-neutral-800 opacity-30'
    default:
      return 'bg-neutral-900 border border-neutral-800'
  }
}

function StatusIcon({ status }: { status: TaskStatus }) {
  if (status === 'completed')
    return <span className="text-green-400 text-sm leading-none">+</span>
  if (status === 'rescheduled')
    return <span className="text-amber-400 text-sm leading-none">-&gt;</span>
  if (status === 'cancelled')
    return <span className="text-neutral-600 text-sm leading-none">x</span>
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
  const base =
    'text-xs px-2.5 py-1 rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-40'
  const colors = {
    green: active
      ? 'bg-green-500/10 text-green-400 border-green-500/30'
      : 'text-neutral-500 border-transparent hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/20',
    amber: active
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      : 'text-neutral-500 border-transparent hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/20',
    red: active
      ? 'bg-red-500/10 text-red-400 border-red-500/30'
      : 'text-neutral-500 border-transparent hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20',
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
  const timeLocked = isTimeLocked(task.task_date, task.start_time)

  return (
    <div
      className={`rounded-xl px-4 py-3.5 transition-all duration-300 ${cardStyle(optimisticStatus)}`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: title + time */}
        <div className="flex items-start gap-2 min-w-0">
          <div className="mt-0.5 shrink-0 w-5">
            <StatusIcon status={optimisticStatus} />
          </div>
          <div className="min-w-0">
            <p
              className={`text-sm font-medium leading-snug truncate ${
                isCancelled
                  ? 'line-through text-neutral-700'
                  : optimisticStatus === 'completed'
                  ? 'text-neutral-500'
                  : 'text-white'
              }`}
            >
              {task.title}
            </p>

            {task.start_time && (
              <p className="text-xs text-neutral-500 mt-0.5 tabular-nums">
                {task.start_time.slice(0, 5)}
                {task.end_time ? ` - ${task.end_time.slice(0, 5)}` : ''}
                {optimisticStatus === 'rescheduled' && (
                  <span className="ml-1.5 text-amber-500/50 text-[11px]">~</span>
                )}
              </p>
            )}

            {!task.start_time && optimisticStatus === 'rescheduled' && (
              <span className="text-[10px] text-amber-500/50 leading-none mt-0.5 block">~</span>
            )}

            {/* Metric badges */}
            {!isCancelled && (task.energy_cost != null || task.flexibility_score != null) && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {task.energy_cost != null && (
                  <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded tabular-nums">
                    E {task.energy_cost}
                  </span>
                )}
                {task.flexibility_score != null && (
                  <span className="text-[10px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded tabular-nums">
                    F {task.flexibility_score}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: action buttons */}
        {!isCancelled && (
          <div className="flex items-center gap-1.5 shrink-0">
            {timeLocked ? (
              <span
                title="Bu gorevin saati henuz gelmedi"
                className="text-xs text-neutral-700 select-none tabular-nums"
                aria-label="Gorev kilitli"
              >
                --
              </span>
            ) : (
              <>
                <ActionButton
                  label="Yaptim"
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
                  label="Olmadi"
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
