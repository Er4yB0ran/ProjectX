'use client'

import { useState, useOptimistic, useTransition } from 'react'
import type { SkeletonBlock } from '@/types/supabase'
import { createTemplateBlock, updateTemplateBlock, deleteTemplateBlock } from './actions'
import type { BlockFormData } from './actions'

// ─── Sabitler ────────────────────────────────────────────────────────────────

/**
 * DB encoding: 0 = Pazartesi … 5 = Cumartesi, 6 = Pazar
 * (dashboard/page.tsx: dbDayOfWeek = (jsDay + 6) % 7)
 */
const DAY_NAMES = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
] as const

const DAY_COLORS = [
  'bg-blue-400/15 text-blue-600',
  'bg-indigo-400/15 text-indigo-600',
  'bg-violet-400/15 text-violet-600',
  'bg-purple-400/15 text-purple-600',
  'bg-pink-400/15 text-pink-600',
  'bg-rose-400/15 text-rose-600',
  'bg-amber-400/15 text-amber-600',
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

function ScoreButtons({ value, onChange, disabled, variant }: ScoreButtonsProps) {
  const LABELS: Record<number, string> = {
    1: '1',
    2: '2',
    3: '3',
    4: '4',
    5: '5',
  }

  return (
    <div className="flex gap-1.5">
      {([1, 2, 3, 4, 5] as const).map((n) => {
        const isActive = value === n
        const activeClass =
          variant === 'amber'
            ? 'bg-amber-400 text-white border-amber-400'
            : 'bg-indigo-500 text-white border-indigo-500'
        return (
          <button
            key={n}
            type="button"
            onClick={() => !disabled && onChange(n)}
            disabled={disabled}
            aria-pressed={isActive}
            className={`w-9 h-9 text-xs rounded-xl font-semibold border transition-all
              ${isActive ? activeClass : 'bg-white/60 text-gray-500 border-gray-200 hover:bg-gray-100'}
              ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {LABELS[n]}
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
        ${checked ? 'bg-red-400' : 'bg-gray-200'}
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
        bg-white/65 backdrop-blur-sm border border-white/50 rounded-xl
        transition-all duration-200
        ${isDeleting ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}
    >
      {/* Sol: başlık + saat bilgisi */}
      <div className="flex items-start gap-2 min-w-0">
        {block.is_hard_constraint && (
          <span
            title="Sabit görev — ertelenemez"
            className="shrink-0 mt-0.5 text-xs text-red-400 select-none"
          >
            🔒
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate leading-snug">
            {block.title}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">
            {block.start_time.slice(0, 5)} – {block.end_time.slice(0, 5)}
          </p>
        </div>
      </div>

      {/* Sağ: skor rozetleri + aksiyonlar */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Enerji */}
        <span className="hidden sm:flex items-center gap-0.5 text-xs text-amber-500 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md">
          <span>⚡</span>
          <span>{block.energy_cost}</span>
        </span>
        {/* Esneklik */}
        <span className="hidden sm:flex items-center gap-0.5 text-xs text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md">
          <span>↔</span>
          <span>{block.flexibility_score}</span>
        </span>

        {/* Butonlar */}
        <button
          type="button"
          onClick={onEdit}
          disabled={isPending}
          className="text-xs text-indigo-500 hover:text-white hover:bg-indigo-500 border border-indigo-200 hover:border-indigo-500
            px-2.5 py-1 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Düzenle
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          className="text-xs text-red-400 hover:text-white hover:bg-red-400 border border-red-200 hover:border-red-400
            px-2.5 py-1 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
      // İş kuralı: sabit görev → esneklik skoru her zaman 1
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
        bg-black/25 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full sm:max-w-md bg-white/92 backdrop-blur-md border border-white/60
          rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-y-auto max-h-[92svh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">
            {isEditing ? 'Bloğu Düzenle' : 'Yeni Blok Ekle'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          {/* Görev Adı */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Görev Adı</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Sabah egzersizi, Ders çalışma..."
              autoFocus
              className="w-full px-3 py-2.5 text-sm bg-white/80 border border-gray-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-300
                placeholder-gray-300 transition-all"
            />
          </div>

          {/* Gün */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Gün</label>
            <div className="relative">
              <select
                value={form.day_of_week}
                onChange={(e) => update('day_of_week', Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm bg-white/80 border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-300
                  appearance-none cursor-pointer transition-all"
              >
                {DAY_NAMES.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                ▾
              </span>
            </div>
          </div>

          {/* Saatler */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Başlangıç</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => update('start_time', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white/80 border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-300
                  transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Bitiş</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => update('end_time', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white/80 border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-300
                  transition-all"
              />
            </div>
          </div>

          {/* Sabit Görev Toggle */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 border border-gray-100 rounded-xl">
            <div>
              <p className="text-xs font-medium text-gray-700">Sabit Görev</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Ders, staj, randevu gibi kaydırılamaz bloklar
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
              <label className="text-xs font-medium text-gray-600">Enerji Maliyeti</label>
              <span className="text-xs text-amber-500 font-medium">
                {['', 'Çok Düşük', 'Düşük', 'Orta', 'Yüksek', 'Çok Yüksek'][form.energy_cost]}
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
                className={`text-xs font-medium ${form.is_hard_constraint ? 'text-gray-400' : 'text-gray-600'}`}
              >
                Esneklik Skoru
                {form.is_hard_constraint && (
                  <span className="ml-1.5 text-red-400 font-normal">(sabit görevde 1&apos;e kilitlendi)</span>
                )}
              </label>
              <span
                className={`text-xs font-medium ${form.is_hard_constraint ? 'text-gray-400' : 'text-indigo-500'}`}
              >
                {['', 'Kesinlikle bu saatte', 'Çok az esneklik', 'Orta esneklik', 'Esnek', 'Tam esnek'][form.flexibility_score]}
              </span>
            </div>
            <ScoreButtons
              value={form.flexibility_score}
              onChange={(v) => update('flexibility_score', v)}
              disabled={form.is_hard_constraint}
              variant="indigo"
            />
          </div>

          {/* Hata mesajı */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200
              rounded-xl transition-colors disabled:opacity-50 font-medium"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitDisabled}
            className="flex-1 py-2.5 text-sm text-white bg-indigo-500 hover:bg-indigo-600
              rounded-xl transition-colors disabled:opacity-50 font-medium"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Kaydediliyor…
              </span>
            ) : isEditing ? (
              'Güncelle'
            ) : (
              'Ekle'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

interface TemplateManagerProps {
  blocks: SkeletonBlock[]
}

export default function TemplateManager({ blocks: initialBlocks }: TemplateManagerProps) {
  const [isPending, startTransition] = useTransition()

  // Silme işlemi için optimistic UI
  const [optimisticBlocks, dispatchOptimistic] = useOptimistic(
    initialBlocks,
    (state: SkeletonBlock[], action: { type: 'delete'; id: string } | { type: 'update'; block: SkeletonBlock }) => {
      if (action.type === 'delete') return state.filter((b) => b.id !== action.id)
      if (action.type === 'update') return state.map((b) => (b.id === action.block.id ? action.block : b))
      return state
    }
  )

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<SkeletonBlock | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Modal yardımcıları ──

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
    if (isPending) return // işlem devam ederken kapatma
    setModalOpen(false)
    setEditingBlock(null)
    setFormError(null)
  }

  // ── Aksiyonlar ──

  function handleSubmit() {
    setFormError(null)

    const payload: BlockFormData = {
      ...form,
      // İş kuralı: sabit görev → esneklik skoru 1
      flexibility_score: form.is_hard_constraint ? 1 : form.flexibility_score,
    }

    startTransition(async () => {
      try {
        if (editingBlock) {
          // Optimistic update
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
        setFormError(err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu')
      }
    })
  }

  function handleDelete(block: SkeletonBlock) {
    if (!confirm(`"${block.title}" bloğunu silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz.`)) return

    setDeletingId(block.id)

    startTransition(async () => {
      dispatchOptimistic({ type: 'delete', id: block.id })
      try {
        await deleteTemplateBlock(block.id)
      } catch (err) {
        console.error('Blok silinemedi:', err)
        // useOptimistic otomatik olarak önceki state'e döner
      } finally {
        setDeletingId(null)
      }
    })
  }

  // ── Gün bazında gruplama ──

  const blocksByDay = DAY_NAMES.map((_, i) =>
    optimisticBlocks
      .filter((b) => b.day_of_week === i)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  )

  const totalBlocks = optimisticBlocks.length
  const hardBlocks = optimisticBlocks.filter((b) => b.is_hard_constraint).length

  return (
    <>
      {/* ── Sayfa ── */}
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Haftalık Şablon</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {totalBlocks} blok
              {hardBlocks > 0 && (
                <span className="ml-2 text-red-400">• {hardBlocks} sabit</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            disabled={isPending}
            className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white
              text-sm font-medium px-4 py-2.5 rounded-xl transition-colors
              disabled:opacity-50 shadow-sm shadow-indigo-200"
          >
            <span className="text-base leading-none">+</span>
            Yeni Blok
          </button>
        </div>

        {/* İstatistik kartları */}
        {totalBlocks > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/55 backdrop-blur-sm border border-white/40 rounded-2xl px-4 py-3 text-center">
              <p className="text-xl font-semibold text-gray-800">{totalBlocks}</p>
              <p className="text-xs text-gray-400 mt-0.5">Toplam Blok</p>
            </div>
            <div className="bg-white/55 backdrop-blur-sm border border-white/40 rounded-2xl px-4 py-3 text-center">
              <p className="text-xl font-semibold text-red-500">{hardBlocks}</p>
              <p className="text-xs text-gray-400 mt-0.5">Sabit</p>
            </div>
            <div className="bg-white/55 backdrop-blur-sm border border-white/40 rounded-2xl px-4 py-3 text-center">
              <p className="text-xl font-semibold text-green-600">{totalBlocks - hardBlocks}</p>
              <p className="text-xs text-gray-400 mt-0.5">Esnek</p>
            </div>
          </div>
        )}

        {/* Günler */}
        <div className="space-y-3">
          {DAY_NAMES.map((dayName, dayIndex) => {
            const dayBlocks = blocksByDay[dayIndex]
            const colorClass = DAY_COLORS[dayIndex]

            return (
              <div
                key={dayIndex}
                className="bg-white/55 backdrop-blur-sm border border-white/40 rounded-2xl p-4"
              >
                {/* Gün başlığı */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colorClass}`}
                  >
                    {dayName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {dayBlocks.length > 0
                      ? `${dayBlocks.length} blok`
                      : 'boş'}
                  </span>
                </div>

                {/* Bloklar */}
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
                  <p className="text-xs text-gray-300 italic pl-1">
                    Bu gün için henüz blok eklenmedi
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Boş durum */}
        {totalBlocks === 0 && (
          <div className="mt-4 bg-white/40 backdrop-blur-sm border border-dashed border-gray-300/50 rounded-2xl p-10 text-center">
            <p className="text-gray-400 text-sm">Henüz haftalık şablon oluşturulmadı.</p>
            <p className="text-gray-300 text-xs mt-1.5">
              Yukarıdaki &ldquo;+ Yeni Blok&rdquo; butonuyla ilk bloğunu ekleyebilirsin.
            </p>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
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
