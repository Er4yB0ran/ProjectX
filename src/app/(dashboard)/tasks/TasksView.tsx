'use client'

import { useState, useTransition, useOptimistic } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Task, TaskStatus } from '@/types/supabase'
import { formatDate, formatShortDate } from '@/lib/date'
import { deleteTask } from './actions'
import TaskFormModal from '@/components/TaskFormModal'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'pending', label: 'Bekleyen' },
  { value: 'completed', label: 'Tamamlanan' },
  { value: 'rescheduled', label: 'Ertelenen' },
  { value: 'cancelled', label: 'İptal' },
]

function StatusIcon({ status }: { status: TaskStatus }) {
  switch (status) {
    case 'completed':
      return <span className="text-green-400 text-sm leading-none w-4 shrink-0">✓</span>
    case 'rescheduled':
      return <span className="text-amber-400 text-sm leading-none w-4 shrink-0">→</span>
    case 'cancelled':
      return <span className="text-neutral-600 text-sm leading-none w-4 shrink-0">✗</span>
    default:
      return <span className="text-neutral-500 text-sm leading-none w-4 shrink-0">–</span>
  }
}

function TaskRow({
  task,
  onDelete,
  isPending,
}: {
  task: Task
  onDelete: () => void
  isPending: boolean
}) {
  const isCancelled = task.status === 'cancelled'
  const isRescheduled = task.status === 'rescheduled' && task.task_date !== task.original_date

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800">
      <StatusIcon status={task.status} />

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            isCancelled
              ? 'line-through text-neutral-600'
              : task.status === 'completed'
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
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isRescheduled && (
          <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded tabular-nums">
            → {formatShortDate(task.task_date)}
          </span>
        )}
        {!isCancelled && task.energy_cost != null && (
          <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded tabular-nums">
            E {task.energy_cost}
          </span>
        )}
        {!isCancelled && task.flexibility_score != null && (
          <span className="text-[10px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded tabular-nums">
            F {task.flexibility_score}
          </span>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          title="Sil"
          aria-label="Görevi sil"
          className="ml-1 text-neutral-600 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm leading-none w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/10"
        >
          ×
        </button>
      </div>
    </div>
  )
}

interface Props {
  tasks: Task[]
  activeStatus: string
}

export default function TasksView({ tasks, activeStatus }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const [optimisticTasks, dispatchOptimistic] = useOptimistic(
    tasks,
    (
      state: Task[],
      action: { type: 'remove'; id: string } | { type: 'cancel'; id: string }
    ) => {
      if (action.type === 'remove') return state.filter((t) => t.id !== action.id)
      if (action.type === 'cancel')
        return state.map((t) =>
          t.id === action.id ? { ...t, status: 'cancelled' as TaskStatus } : t
        )
      return state
    }
  )

  function setFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('status')
    } else {
      params.set('status', value)
    }
    router.push(`/tasks?${params.toString()}`)
  }

  function handleDelete(task: Task) {
    const isManual = task.skeleton_block_id === null

    if (
      isManual &&
      !window.confirm(`"${task.title}" görevini kalıcı olarak silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`)
    )
      return

    setDeletingId(task.id)
    startTransition(async () => {
      dispatchOptimistic({ type: isManual ? 'remove' : 'cancel', id: task.id })
      try {
        await deleteTask(task.id)
      } catch (err) {
        console.error('Görev silinemedi:', err)
      } finally {
        setDeletingId(null)
      }
    })
  }

  // Group tasks by original_date
  const grouped = optimisticTasks.reduce<Record<string, Task[]>>((acc, task) => {
    const key = task.original_date
    if (!acc[key]) acc[key] = []
    acc[key].push(task)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
  const todayStr = new Date().toLocaleDateString('sv-SE')

  return (
    <div className="space-y-6">
      {/* Filter tabs + Add task */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(({ value, label }) => {
            const isActive = activeStatus === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-neutral-700 text-white'
                    : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 rounded-lg px-3 py-1.5 transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Görev ekle
        </button>
      </div>

      {/* Task list */}
      {sortedDates.length === 0 ? (
        <p className="text-sm text-neutral-600 mt-8">Görev bulunamadı.</p>
      ) : (
        sortedDates.map((date) => (
          <div key={date}>
            <p className="text-xs text-neutral-500 mb-2 font-medium tracking-wide uppercase">
              {formatDate(date)}
            </p>
            <div className="space-y-1.5">
              {grouped[date].map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onDelete={() => handleDelete(task)}
                  isPending={isPending && deletingId === task.id}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {formOpen && (
        <TaskFormModal defaultDate={todayStr} dateEditable onClose={() => setFormOpen(false)} />
      )}
    </div>
  )
}
