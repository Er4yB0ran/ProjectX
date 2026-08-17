'use client'

import { useState, useTransition } from 'react'
import { createTask } from '@/app/(dashboard)/tasks/actions'

interface TaskFormModalProps {
  /** YYYY-MM-DD */
  defaultDate: string
  /** true ise kullanıcı tarihi değiştirebilir (arşiv sayfası). false ise sabit (bugün). */
  dateEditable?: boolean
  onClose: () => void
}

const inputClass =
  'w-full px-3 py-2 text-sm text-white placeholder-neutral-600 rounded-lg bg-neutral-950 ' +
  'border border-neutral-800 focus:outline-none focus:border-neutral-600 transition-colors [color-scheme:dark]'

const labelClass = 'block text-xs font-medium text-neutral-500 mb-1.5'

export default function TaskFormModal({ defaultDate, dateEditable = false, onClose }: TaskFormModalProps) {
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [taskDate, setTaskDate] = useState(defaultDate)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [energyCost, setEnergyCost] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    if (isPending) return
    onClose()
  }

  function handleSubmit() {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Görev adı zorunludur')
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        await createTask({
          title: trimmedTitle,
          task_date: taskDate,
          start_time: startTime || undefined,
          end_time: endTime || undefined,
          description: description.trim() || undefined,
          energy_cost: energyCost ?? undefined,
        })
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Görev eklenemedi')
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="w-full sm:max-w-sm bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-xl overflow-y-auto max-h-[92svh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-neutral-800">
          <h3 className="text-sm font-semibold text-white">Yeni Görev</h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="text-neutral-500 hover:text-white transition-colors text-lg leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-800 disabled:opacity-40"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-3.5">
          <div>
            <label className={labelClass}>Görev adı</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn. Market alışverişi"
              autoFocus
              className={inputClass}
            />
          </div>

          {dateEditable && (
            <div>
              <label className={labelClass}>Tarih</label>
              <input
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Başlangıç (opsiyonel)</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Bitiş (opsiyonel)</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Açıklama (opsiyonel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className={labelClass}>Enerji maliyeti (opsiyonel)</label>
            <div className="flex gap-1.5">
              {([1, 2, 3, 4, 5] as const).map((n) => {
                const isActive = energyCost === n
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEnergyCost(isActive ? null : n)}
                    aria-pressed={isActive}
                    className={`w-8 h-8 text-xs rounded-lg font-medium border transition-colors ${
                      isActive
                        ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                        : 'text-neutral-500 border-neutral-800 hover:border-neutral-700 hover:text-neutral-300'
                    }`}
                  >
                    {n}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2 bg-red-500/10 border border-red-500/25">
              <span className="text-red-400 mt-0.5 shrink-0 text-xs">!</span>
              <p className="text-xs text-red-400/85">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-neutral-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="flex-1 py-2 text-sm font-medium text-neutral-400 hover:text-white border border-neutral-800 rounded-lg transition-colors disabled:opacity-40"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !title.trim()}
            className="flex-1 py-2 text-sm font-medium text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? 'Ekleniyor...' : 'Ekle'}
          </button>
        </div>
      </div>
    </div>
  )
}
