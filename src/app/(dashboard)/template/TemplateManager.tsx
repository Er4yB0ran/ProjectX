'use client'

import { useState, useOptimistic, useTransition } from 'react'
import type { SkeletonBlock } from '@/types/supabase'
import { createTemplateBlock, updateTemplateBlock, deleteTemplateBlock } from './actions'
import type { BlockFormData } from './actions'

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_NAMES = [
  'Pazartesi',
  'Sali',
  'Carsamba',
  'Persembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
] as const

/** Glass-tinted day badges — color + glass border */
const DAY_COLORS = [
  'text-blue-400   bg-blue-500/10   border border-blue-500/25',
  'text-indigo-400 bg-indigo-500/10 border border-indigo-500/25',
  'text-violet-400 bg-violet-500/10 border border-violet-500/25',
  'text-purple-400 bg-purple-500/10 border border-purple-500/25',
  'text-pink-400   bg-pink-500/10   border border-pink-500/25',
  'text-rose-400   bg-rose-500/10   border border-rose-500/25',
  'text-amber-400  bg-amber-500/10  border border-amber-500/25',
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

// ─── Glass design tokens ──────────────────────────────────────────────────────

const glassInput =
  'w-full px-3 py-2.5 text-sm text-white placeholder-white/20 rounded-xl ' +
  'bg-white/[0.05] border border-white/[0.10] ' +
  'focus:outline-none focus:border-violet-500/45 focus:ring-1 focus:ring-violet-500/15 ' +
  'transition-all duration-200 [color-scheme:dark]'

// ─── ScoreButtons ─────────────────────────────────────────────────────────────

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
            className={`w-9 h-9 text-xs rounded-lg font-semibold border transition-all duration-200 cursor-pointer
              ${isActive
                ? 'text-white border-violet-500/50 bg-violet-600/25 shadow-[0_0_10px_rgba(139,92,246,0.18)]'
                : 'text-white/35 border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08] hover:text-white/65 hover:border-white/[0.15]'
              }
              ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}

// ─── ToggleSwitch ─────────────────────────────────────────────────────────────

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
      className={`relative w-11 h-6 rounded-full transition-all duration-300 cursor-pointer
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      style={{
        background: checked ? 'rgba(239,68,68,0.75)' : 'rgba(255,255,255,0.10)',
        boxShadow: checked ? '0 0 14px rgba(239,68,68,0.3)' : 'none',
      }}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-sm transition-all duration-300
          ${checked ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white/75'}`}
      />
    </button>
  )
}

// ─── BlockCard ────────────────────────────────────────────────────────────────

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
        backdrop-blur-sm border rounded-xl
        transition-all duration-300
        ${isDeleting
          ? 'opacity-20 scale-95'
          : 'opacity-100 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
        }`}
      style={{
        background: 'rgba(255,255,255,0.06)',
        borderColor: isDeleting ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
      }}
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
          <p className="text-xs text-white/30 mt-0.5 font-mono tabular-nums">
            {block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)}
          </p>
        </div>
      </div>

      {/* Right: score badges + actions */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:flex items-center text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded tabular-nums">
          E {block.energy_cost}
        </span>
        <span className="hidden sm:flex items-center text-[10px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded tabular-nums">
          F {block.flexibility_score}
        </span>

        <button
          type="button"
          onClick={onEdit}
          disabled={isPending}
          className="text-xs text-white/35 hover:text-white border border-white/[0.10] hover:border-white/[0.22] hover:bg-white/[0.06]
            px-2.5 py-1 rounded transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Duzenle
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          className="text-xs text-white/30 hover:text-red-400 border border-white/[0.10] hover:border-red-500/30 hover:bg-red-500/10
            px-2.5 py-1 rounded transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Sil
        </button>
      </div>
    </div>
  )
}

// ─── BlockModal ───────────────────────────────────────────────────────────────

interface BlockModalProps {
  isEditing: boolean
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  isPending: boolean
  error: string | null
  onClose: () => void
  onSubmit: () => void
}

function BlockModal({ isEditing, form, setForm, isPending, error, onClose, onSubmit }: BlockModalProps) {
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full sm:max-w-md backdrop-blur-2xl border
          rounded-t-2xl sm:rounded-2xl overflow-y-auto max-h-[92svh] sm:max-h-[90vh]
          animate-[fade-up_0.2s_ease-out]"
        style={{
          background: 'rgba(8,8,14,0.90)',
          borderColor: 'rgba(255,255,255,0.09)',
          boxShadow: '0 28px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <h3 className="text-base font-semibold text-white">
            {isEditing ? 'Bloku Duzenle' : 'Yeni Blok Ekle'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/35 hover:text-white transition-colors text-lg leading-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.07] cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          {/* Gorev Adi */}
          <div>
            <label className="block text-xs font-medium text-white/40 mb-1.5">Gorev Adi</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Sabah egzersizi, Ders calisma..."
              autoFocus
              className={glassInput}
            />
          </div>

          {/* Gun */}
          <div>
            <label className="block text-xs font-medium text-white/40 mb-1.5">Gun</label>
            <div className="relative">
              <select
                value={form.day_of_week}
                onChange={(e) => update('day_of_week', Number(e.target.value))}
                className={`${glassInput} appearance-none cursor-pointer`}
              >
                {DAY_NAMES.map((name, i) => (
                  <option key={i} value={i} style={{ background: '#0d0d14', color: '#fff' }}>
                    {name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">
                ▾
              </span>
            </div>
          </div>

          {/* Saatler */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/40 mb-1.5">Baslangic</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => update('start_time', e.target.value)}
                className={glassInput}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/40 mb-1.5">Bitis</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => update('end_time', e.target.value)}
                className={glassInput}
              />
            </div>
          </div>

          {/* Sabit Gorev Toggle */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderColor: form.is_hard_constraint
                ? 'rgba(239,68,68,0.25)'
                : 'rgba(255,255,255,0.09)',
            }}
          >
            <div>
              <p className="text-xs font-medium text-white/75">Sabit Gorev</p>
              <p className="text-xs text-white/30 mt-0.5">
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
              <label className="text-xs font-medium text-white/40">Enerji Maliyeti</label>
              <span className="text-xs text-amber-400/80 font-medium">
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
                className={`text-xs font-medium ${
                  form.is_hard_constraint ? 'text-white/20' : 'text-white/40'
                }`}
              >
                Esneklik Skoru
                {form.is_hard_constraint && (
                  <span className="ml-1.5 text-red-400/60 font-normal">(sabit gorevde 1&apos;e kilitlendi)</span>
                )}
              </label>
              <span
                className={`text-xs font-medium ${
                  form.is_hard_constraint ? 'text-white/20' : 'text-cyan-400/80'
                }`}
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
            <div
              className="flex items-start gap-2 rounded-xl px-3 py-2.5"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
              }}
            >
              <span className="text-red-400 mt-0.5 shrink-0 text-xs">!</span>
              <p className="text-xs text-red-400/85">{error}</p>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div
          className="flex gap-2 px-5 pb-5 pt-3 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 text-sm font-medium text-white/55 hover:text-white
              rounded-xl transition-all duration-200 disabled:opacity-40 cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
            }}
          >
            Iptal
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitDisabled}
            className="flex-1 py-2.5 text-sm font-medium text-white
              rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{
              background: isSubmitDisabled ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.35)',
              border: '1px solid rgba(139,92,246,0.40)',
              boxShadow: isSubmitDisabled ? 'none' : '0 0 16px rgba(139,92,246,0.18)',
            }}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span
                  className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }}
                />
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
    (
      state: SkeletonBlock[],
      action: { type: 'delete'; id: string } | { type: 'update'; block: SkeletonBlock }
    ) => {
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
      {/* ── Background bloom orbs ── */}
      <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden">
        {/* Top-right — indigo */}
        <div
          className="absolute -top-48 -right-48 w-[52vw] h-[52vw] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 65%)',
            filter: 'blur(48px)',
            animation: 'bloom-pulse 9s ease-in-out infinite',
          }}
        />
        {/* Bottom-left — violet */}
        <div
          className="absolute -bottom-64 -left-48 w-[60vw] h-[60vw] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 65%)',
            filter: 'blur(60px)',
            animation: 'bloom-pulse 12s ease-in-out infinite 3.5s',
          }}
        />
        {/* Center — blue accent */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[38vw] h-[38vw] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 65%)',
            filter: 'blur(56px)',
            animation: 'bloom-pulse 15s ease-in-out infinite 6s',
          }}
        />
      </div>

      {/* ── Page ── */}
      <div className="relative z-10 max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-white tracking-tight">Haftalik Sablon</h2>
            <p className="text-sm text-white/30 mt-0.5">
              {totalBlocks} blok
              {hardBlocks > 0 && (
                <span className="ml-2 text-red-400/75">/ {hardBlocks} sabit</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            disabled={isPending}
            className="flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2.5 rounded-xl
              backdrop-blur-sm transition-all duration-300 disabled:opacity-40 cursor-pointer
              hover:shadow-[0_0_22px_rgba(139,92,246,0.25)]"
            style={{
              background: 'rgba(139,92,246,0.16)',
              border: '1px solid rgba(139,92,246,0.32)',
            }}
          >
            <span className="text-base leading-none">+</span>
            Yeni Blok
          </button>
        </div>

        {/* Stat cards */}
        {totalBlocks > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { val: totalBlocks, label: 'Toplam Blok', color: 'text-white' },
              { val: hardBlocks, label: 'Sabit', color: 'text-red-400' },
              { val: totalBlocks - hardBlocks, label: 'Esnek', color: 'text-emerald-400' },
            ].map(({ val, label, color }) => (
              <div
                key={label}
                className="backdrop-blur-md rounded-2xl px-4 py-3 text-center transition-all duration-300
                  hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p className={`text-xl font-semibold tabular-nums ${color}`}>{val}</p>
                <p className="text-xs text-white/30 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Day columns */}
        <div className="space-y-3">
          {DAY_NAMES.map((dayName, dayIndex) => {
            const dayBlocks = blocksByDay[dayIndex]
            const colorClass = DAY_COLORS[dayIndex]

            return (
              <div
                key={dayIndex}
                className="backdrop-blur-md rounded-2xl p-4 transition-all duration-300
                  hover:shadow-[0_8px_32px_rgba(0,0,0,0.28)]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {/* Day header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colorClass}`}>
                    {dayName}
                  </span>
                  <span className="text-xs text-white/22">
                    {dayBlocks.length > 0 ? `${dayBlocks.length} blok` : 'bos'}
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
                  <p className="text-xs text-white/18 pl-1">
                    Bu gun icin henuz blok eklenmedi
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Empty state */}
        {totalBlocks === 0 && (
          <div
            className="mt-4 backdrop-blur-md rounded-2xl p-10 text-center"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px dashed rgba(255,255,255,0.08)',
            }}
          >
            <p className="text-white/35 text-sm">Henuz haftalik sablon olusturulmadi.</p>
            <p className="text-white/18 text-xs mt-1.5">
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
