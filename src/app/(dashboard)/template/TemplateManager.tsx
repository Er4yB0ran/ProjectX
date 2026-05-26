'use client'

import { useState, useOptimistic, useTransition } from 'react'
import type { SkeletonBlock } from '@/types/supabase'
import { createTemplateBlock, updateTemplateBlock, deleteTemplateBlock } from './actions'
import type { BlockFormData } from './actions'

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * DB encoding: 0 = Monday ... 5 = Saturday, 6 = Sunday
 */
const DAY_NAMES = [
  'Pazartesi',
  'Sali',
  'Carsamba',
  'Persembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
] as const

const DAY_COLORS = [
  'bg-blue-500/15 text-blue-400',
  'bg-indigo-500/15 text-indigo-400',
  'bg-violet-500/15 text-violet-400',
  'bg-purple-500/15 text-purple-400',
  'bg-pink-500/15 text-pink-400',
  'bg-rose-500/15 text-rose-400',
  'bg-amber-500/15 text-amber-400',
] as const

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = BlockFormData

const DEFAULT_FORM: FormState = {
  title: '',
  day_of_week: 0,
  start_time: '09:00',
  end_time: '10:00',
  is_hard_constraint: false,
  energy_cost: 3,
  flexibility_score: 3,
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ScoreButtonsProps {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
  variant: 'amber' | 'indigo'
}

function ScoreButtons({ value, onChange, disabled }: ScoreButtonsProps) {
  return (
    <div className="flex gap-1.5">
      {([1, 2, 3, 4, 5] as const).map((n) => {
        const isActive = value === n
        return (
          <button
            key={n}
            type="button"
            onClick={() => !disabled && onChange(n)}
            disabled={disabled}
            aria-pressed={isActive}
            className={`w-9 h-9 text-xs rounded-lg font-semibold border transition-all
              ${isActive
                ? 'bg-neutral-700 text-white border-neutral-600'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700 hover:text-white'
              }
              ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}

interface ToggleSwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200
        ${checked ? 'bg-red-500' : 'bg-neutral-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
}

// ─── Block Card ───────────────────────────────────────────────────────────────

interface BlockCardProps {
  block: SkeletonBlock
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
  isPending: boolean
}

function BlockCard({ block, onEdit, onDelete, isDeleting, isPending }: BlockCardProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-3.5 py-3
        bg-neutral-800 border border-neutral-700 rounded-xl
        transition-all duration-200
        ${isDeleting ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}
    >
      {/* Left: title + time */}
      <div className="flex items-start gap-2 min-w-0">
        {block.is_hard_constraint && (
          <span
            title="Sabit gorev — ertelenemez"
            className="shrink-0 mt-0.5 text-[10px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-1 py-0.5 rounded select-none"
          >
            SAB
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate leading-snug">
            {block.title}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5 font-mono tabular-nums">
            {block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)}
          </p>
        </div>
      </div>

      {/* Right: score badges + actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Energy */}
        <span className="hidden sm:flex items-center gap-0.5 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded tabular-nums">
          E {block.energy_cost}
        </span>
        {/* Flexibility */}
        <span className="hidden sm:flex items-center gap-0.5 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded tabular-nums">
          F {block.flexibility_score}
        </span>

        {/* Buttons */}
        <button
          type="button"
          onClick={onEdit}
          disabled={isPending}
          className="text-xs text-neutral-400 hover:text-white border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-700
            px-2.5 py-1 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Duzenle
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          className="text-xs text-neutral-500 hover:text-red-400 border border-neutral-700 hover:border-red-500/30 hover:bg-red-500/10
            px-2.5 py-1 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Sil
        </button>
      </div>
    </div>
  )
}

// ─── Block Form Modal ─────────────────────────────────────────────────────────

interface BlockModalProps {
  isEditing: boolean
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  isPending: boolean
  error: string | null
  onClose: () => void
  onSubmit: () => void
}

function BlockModal({
  isEditing,
  form,
  setForm,
  isPending,
  error,
  onClose,
  onSubmit,
}: BlockModalProps) {
  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'is_hard_constraint' && value === true) {
        next.flexibility_score = 1
      }
      return next
    })
  }

  const isSubmitDisabled = isPending || !form.title.trim()

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4
        bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full sm:max-w-md bg-neutral-900 border border-neutral-800
          rounded-t-xl sm:rounded-xl overflow-y-auto max-h-[92svh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-neutral-800">
          <h3 className="text-base font-semibold text-white">
            {isEditing ? 'Bloku Duzenle' : 'Yeni Blok Ekle'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors text-lg leading-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-800"
          >
            x
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          {/* Gorev Adi */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Gorev Adi</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Sabah egzersizi, Ders calisma..."
              autoFocus
              className="w-full px-3 py-2.5 text-sm bg-neutral-800 border border-neutral-700 text-white rounded-lg
                focus:outline-none focus:ring-1 focus:ring-neutral-600 focus:border-neutral-600
                placeholder-neutral-600 transition-all"
            />
          </div>

          {/* Gun */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Gun</label>
            <div className="relative">
              <select
                value={form.day_of_week}
                onChange={(e) => update('day_of_week', Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm bg-neutral-800 border border-neutral-700 text-white rounded-lg
                  focus:outline-none focus:ring-1 focus:ring-neutral-600 focus:border-neutral-600
                  appearance-none cursor-pointer transition-all"
              >
                {DAY_NAMES.map((name, i) => (
                  <option key={i} value={i} className="bg-neutral-800 text-white">
                    {name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs">
                v
              </span>
            </div>
          </div>

          {/* Saatler */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Baslangic</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => update('start_time', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-neutral-800 border border-neutral-700 text-white rounded-lg
                  focus:outline-none focus:ring-1 focus:ring-neutral-600 focus:border-neutral-600
                  transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Bitis</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => update('end_time', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-neutral-800 border border-neutral-700 text-white rounded-lg
                  focus:outline-none focus:ring-1 focus:ring-neutral-600 focus:border-neutral-600
                  transition-all"
              />
            </div>
          </div>

          {/* Sabit Gorev Toggle */}
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl">
            <div>
              <p className="text-xs font-medium text-neutral-300">Sabit Gorev</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Ders, staj, randevu gibi kaydirilamaz bloklar
              </p>
            </div>
            <ToggleSwitch
              checked={form.is_hard_constraint}
              onChange={(v) => update('is_hard_constraint', v)}
            />
          </div>

          {/* Enerji Maliyeti */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-neutral-400">Enerji Maliyeti</label>
              <span className="text-xs text-amber-400 font-medium">
                {['', 'Cok Dusuk', 'Dusuk', 'Orta', 'Yuksek', 'Cok Yuksek'][form.energy_cost]}
              </span>
            </div>
            <ScoreButtons
              value={form.energy_cost}
              onChange={(v) => update('energy_cost', v)}
              variant="amber"
            />
          </div>

          {/* Esneklik Skoru */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                className={`text-xs font-medium ${form.is_hard_constraint ? 'text-neutral-600' : 'text-neutral-400'}`}
              >
                Esneklik Skoru
                {form.is_hard_constraint && (
                  <span className="ml-1.5 text-red-400 font-normal">(sabit gorevde 1&apos;e kilitlendi)</span>
                )}
              </label>
              <span
                className={`text-xs font-medium ${form.is_hard_constraint ? 'text-neutral-600' : 'text-cyan-400'}`}
              >
                {['', 'Kesinlikle bu saatte', 'Cok az esneklik', 'Orta esneklik', 'Esnek', 'Tam esnek'][form.flexibility_score]}
              </span>
            </div>
            <ScoreButtons
              value={form.flexibility_score}
              onChange={(v) => update('flexibility_score', v)}
              disabled={form.is_hard_constraint}
              variant="indigo"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5">
              <span className="text-red-400 mt-0.5 shrink-0">!</span>
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 text-sm text-neutral-300 bg-neutral-800 hover:bg-neutral-700
              rounded-xl transition-colors disabled:opacity-50 font-medium"
          >
            Iptal
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitDisabled}
            className="flex-1 py-2.5 text-sm text-white bg-neutral-700 hover:bg-neutral-600
              rounded-xl transition-colors disabled:opacity-50 font-medium"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-neutral-500 border-t-white rounded-full animate-spin" />
                Kaydediliyor...
              </span>
            ) : isEditing ? (
              'Guncelle'
            ) : (
              'Ekle'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface TemplateManagerProps {
  blocks: SkeletonBlock[]
}

export default function TemplateManager({ blocks: initialBlocks }: TemplateManagerProps) {
  const [isPending, startTransition] = useTransition()

  const [optimisticBlocks, dispatchOptimistic] = useOptimistic(
    initialBlocks,
    (state: SkeletonBlock[], action: { type: 'delete'; id: string } | { type: 'update'; block: SkeletonBlock }) => {
      if (action.type === 'delete') return state.filter((b) => b.id !== action.id)
      if (action.type === 'update') return state.map((b) => (b.id === action.block.id ? action.block : b))
      return state
    }
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<SkeletonBlock | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openCreate() {
    setEditingBlock(null)
    setForm(DEFAULT_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(block: SkeletonBlock) {
    setEditingBlock(block)
    setForm({
      title: block.title,
      day_of_week: block.day_of_week,
      start_time: block.start_time.slice(0, 5),
      end_time: block.end_time.slice(0, 5),
      is_hard_constraint: block.is_hard_constraint,
      energy_cost: block.energy_cost,
      flexibility_score: block.flexibility_score,
    })
    setFormError(null)
    setModalOpen(true)
  }

  function closeModal() {
    if (isPending) return
    setModalOpen(false)
    setEditingBlock(null)
    setFormError(null)
  }

  function handleSubmit() {
    setFormError(null)

    const payload: BlockFormData = {
      ...form,
      flexibility_score: form.is_hard_constraint ? 1 : form.flexibility_score,
    }

    startTransition(async () => {
      try {
        if (editingBlock) {
          dispatchOptimistic({
            type: 'update',
            block: {
              ...editingBlock,
              ...payload,
              start_time: payload.start_time.length === 5 ? `${payload.start_time}:00` : payload.start_time,
              end_time: payload.end_time.length === 5 ? `${payload.end_time}:00` : payload.end_time,
            },
          })
          await updateTemplateBlock(editingBlock.id, payload)
        } else {
          await createTemplateBlock(payload)
        }
        closeModal()
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Beklenmeyen bir hata olustu')
      }
    })
  }

  function handleDelete(block: SkeletonBlock) {
    if (!confirm(`"${block.title}" blogunu silmek istediginizden emin misiniz?\n\nBu islem geri alinamaz.`)) return

    setDeletingId(block.id)

    startTransition(async () => {
      dispatchOptimistic({ type: 'delete', id: block.id })
      try {
        await deleteTemplateBlock(block.id)
      } catch (err) {
        console.error('Blok silinemedi:', err)
      } finally {
        setDeletingId(null)
      }
    })
  }

  const blocksByDay = DAY_NAMES.map((_, i) =>
    optimisticBlocks
      .filter((b) => b.day_of_week === i)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  )

  const totalBlocks = optimisticBlocks.length
  const hardBlocks = optimisticBlocks.filter((b) => b.is_hard_constraint).length

  return (
    <>
      {/* Page */}
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-white tracking-tight">Haftalik Sablon</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              {totalBlocks} blok
              {hardBlocks > 0 && (
                <span className="ml-2 text-red-400">/ {hardBlocks} sabit</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            disabled={isPending}
            className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700
              text-sm font-medium px-4 py-2.5 rounded-xl transition-colors
              disabled:opacity-50"
          >
            <span className="text-base leading-none">+</span>
            Yeni Blok
          </button>
        </div>

        {/* Stat cards */}
        {totalBlocks > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-center">
              <p className="text-xl font-semibold text-white tabular-nums">{totalBlocks}</p>
              <p className="text-xs text-neutral-500 mt-0.5">Toplam Blok</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-center">
              <p className="text-xl font-semibold text-red-400 tabular-nums">{hardBlocks}</p>
              <p className="text-xs text-neutral-500 mt-0.5">Sabit</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-center">
              <p className="text-xl font-semibold text-green-400 tabular-nums">{totalBlocks - hardBlocks}</p>
              <p className="text-xs text-neutral-500 mt-0.5">Esnek</p>
            </div>
          </div>
        )}

        {/* Days */}
        <div className="space-y-3">
          {DAY_NAMES.map((dayName, dayIndex) => {
            const dayBlocks = blocksByDay[dayIndex]
            const colorClass = DAY_COLORS[dayIndex]

            return (
              <div
                key={dayIndex}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-4"
              >
                {/* Day header */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colorClass}`}
                  >
                    {dayName}
                  </span>
                  <span className="text-xs text-neutral-600">
                    {dayBlocks.length > 0
                      ? `${dayBlocks.length} blok`
                      : 'bos'}
                  </span>
                </div>

                {/* Blocks */}
                {dayBlocks.length > 0 ? (
                  <div className="space-y-2">
                    {dayBlocks.map((block) => (
                      <BlockCard
                        key={block.id}
                        block={block}
                        onEdit={() => openEdit(block)}
                        onDelete={() => handleDelete(block)}
                        isDeleting={deletingId === block.id}
                        isPending={isPending}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-700 pl-1">
                    Bu gun icin henuz blok eklenmedi
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Empty state */}
        {totalBlocks === 0 && (
          <div className="mt-4 bg-neutral-900 border border-dashed border-neutral-700 rounded-xl p-10 text-center">
            <p className="text-neutral-400 text-sm">Henuz haftalik sablon olusturulmadi.</p>
            <p className="text-neutral-600 text-xs mt-1.5">
              Yukaridaki &ldquo;+ Yeni Blok&rdquo; butonuyla ilk blogunu ekleyebilirsin.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <BlockModal
          isEditing={editingBlock !== null}
          form={form}
          setForm={setForm}
          isPending={isPending}
          error={formError}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </>
  )
}
