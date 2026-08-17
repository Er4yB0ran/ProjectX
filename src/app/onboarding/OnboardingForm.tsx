'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SkeletonChatEditor from './SkeletonChatEditor'
import type { DraftBlock } from './skeletonChatTypes'

type EnergyPeak = 'Sabah' | 'Öğle' | 'İkindi' | 'Akşam' | 'Gece'

interface FixedBlock {
  title: string
  startTime: string
  endTime: string
}

interface OnboardingFormState {
  weekdayWakeUp: string
  weekdaySleep: string
  weekendWakeUp: string
  weekendSleep: string
  fixedBlocks: FixedBlock[]
  energyPeaks: EnergyPeak[]
  freeDays: number[]
  weekendRoutine: string
  planningStyle: string
}

const ENERGY_PEAKS: EnergyPeak[] = ['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Gece']

const DAYS = [
  { label: 'Pzt', value: 0 },
  { label: 'Sal', value: 1 },
  { label: 'Çar', value: 2 },
  { label: 'Per', value: 3 },
  { label: 'Cum', value: 4 },
  { label: 'Cmt', value: 5 },
  { label: 'Paz', value: 6 },
]

const STEP_TITLES = [
  'Uyku Düzeni',
  'Sabit Bloklar',
  'Enerji Pikleri',
  'Serbest Günler',
  'Rutin & Planlama',
]

const INITIAL_STATE: OnboardingFormState = {
  weekdayWakeUp: '07:00',
  weekdaySleep: '23:00',
  weekendWakeUp: '09:00',
  weekendSleep: '00:00',
  fixedBlocks: [],
  energyPeaks: [],
  freeDays: [],
  weekendRoutine: '',
  planningStyle: '',
}

const INITIAL_BLOCK: FixedBlock = { title: '', startTime: '09:00', endTime: '17:00' }

interface OnboardingFormProps {
  aiChatEnabled: boolean
}

export default function OnboardingForm({ aiChatEnabled }: OnboardingFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<OnboardingFormState>(INITIAL_STATE)
  const [newBlock, setNewBlock] = useState<FixedBlock>(INITIAL_BLOCK)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'form' | 'review'>('form')
  const [blocks, setBlocks] = useState<DraftBlock[]>([])
  const [committing, setCommitting] = useState(false)

  function updateField<K extends keyof OnboardingFormState>(key: K, value: OnboardingFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function addBlock() {
    if (!newBlock.title.trim() || !newBlock.startTime || !newBlock.endTime) return
    updateField('fixedBlocks', [...form.fixedBlocks, { ...newBlock }])
    setNewBlock(INITIAL_BLOCK)
  }

  function removeBlock(index: number) {
    updateField(
      'fixedBlocks',
      form.fixedBlocks.filter((_, i) => i !== index)
    )
  }

  function toggleEnergyPeak(peak: EnergyPeak) {
    const peaks = form.energyPeaks.includes(peak)
      ? form.energyPeaks.filter((p) => p !== peak)
      : [...form.energyPeaks, peak]
    updateField('energyPeaks', peaks)
  }

  function toggleFreeDay(day: number) {
    const days = form.freeDays.includes(day)
      ? form.freeDays.filter((d) => d !== day)
      : [...form.freeDays, day]
    updateField('freeDays', days)
  }

  async function commitBlocks(blocksToCommit: DraftBlock[]) {
    const res = await fetch('/api/onboarding/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: blocksToCommit.map(({ client_id: _client_id, ...rest }) => rest),
        weekdayWakeUp: form.weekdayWakeUp,
        weekdaySleep: form.weekdaySleep,
        energyPeaks: form.energyPeaks,
      }),
    })
    if (res.ok) {
      router.push('/dashboard')
      return true
    }
    const data = await res.json()
    setError(data.error ?? 'Bir hata oluştu, lütfen tekrar deneyin.')
    return false
  }

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding/generate-skeleton', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Bir hata oluştu, lütfen tekrar deneyin.')
        return
      }
      const data: { blocks: Omit<DraftBlock, 'client_id'>[] } = await res.json()
      const draftBlocks: DraftBlock[] = data.blocks.map((b) => ({
        ...b,
        client_id: crypto.randomUUID(),
      }))

      if (aiChatEnabled) {
        setBlocks(draftBlocks)
        setPhase('review')
      } else {
        await commitBlocks(draftBlocks)
      }
    } catch {
      setError('Bağlantı hatası, lütfen tekrar deneyin.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleContinue(finalBlocks: DraftBlock[]) {
    setError(null)
    setCommitting(true)
    try {
      await commitBlocks(finalBlocks)
    } catch {
      setError('Bağlantı hatası, lütfen tekrar deneyin.')
    } finally {
      setCommitting(false)
    }
  }

  /* ── Design tokens ── */
  const inputClass =
    'w-full bg-[#0a0a0f] border border-[#25253a] text-white placeholder-white/20 ' +
    'rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-500/40 ' +
    'focus:ring-1 focus:ring-violet-500/15 transition-all duration-200 [color-scheme:dark] text-sm'

  const pillBase =
    'px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 cursor-pointer select-none'
  const pillActive =
    'bg-violet-600/20 border-violet-500/45 text-violet-200 shadow-[0_0_14px_rgba(139,92,246,0.18)]'
  const pillInactive =
    'bg-[#0e0e16] border-[#25253a] text-white/40 hover:bg-[#14141e] hover:text-white/65 hover:border-[#363650]'

  if (phase === 'review') {
    return (
      <SkeletonChatEditor
        initialBlocks={blocks}
        committing={committing}
        error={error}
        onContinue={handleContinue}
      />
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#07070a' }}
    >
      {/* Ambient obsidian glow — very subtle, far above */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(109,40,217,0.07) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 w-full max-w-lg">

        {/* ── Step indicator ── */}
        <div className="flex items-center justify-center mb-8 gap-0">
          {STEP_TITLES.map((title, i) => {
            const n = i + 1
            const isActive = n === step
            const isDone = n < step
            return (
              <div key={n} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                      isActive
                        ? 'bg-violet-600 text-white'
                        : isDone
                        ? 'bg-violet-600/35 text-violet-300'
                        : 'bg-[#141418] border border-[#25253a] text-white/20'
                    }`}
                    style={
                      isActive
                        ? {
                            boxShadow:
                              '0 0 0 3px rgba(124,58,237,0.18), 0 0 16px rgba(124,58,237,0.35)',
                          }
                        : undefined
                    }
                  >
                    {isDone ? '✓' : n}
                  </div>
                  <span
                    className={`text-[10px] hidden sm:block transition-all duration-300 ${
                      isActive
                        ? 'text-violet-400'
                        : isDone
                        ? 'text-white/25'
                        : 'text-white/12'
                    }`}
                  >
                    {title}
                  </span>
                </div>
                {i < STEP_TITLES.length - 1 && (
                  <div
                    className={`h-px w-8 sm:w-12 mx-1 mb-5 transition-all duration-500 ${
                      isDone ? 'bg-violet-600/35' : 'bg-[#1e1e28]'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* ── Card ── */}
        <div
          className="rounded-3xl p-8 border border-[#1e1e2a]"
          style={{
            background: '#0d0d12',
            boxShadow:
              '0 28px 64px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* Card header */}
          <h2 className="text-xl font-semibold text-white mb-1 tracking-tight">
            {STEP_TITLES[step - 1]}
          </h2>
          <p className="text-white/32 text-sm mb-6">
            {step === 1 && 'Günlük uyku rutinini belirle.'}
            {step === 2 && 'Esnetemeyeceğin sabit bloklarını ekle.'}
            {step === 3 && 'En verimli olduğun saatleri seç.'}
            {step === 4 && 'Serbest olan günlerini belirt.'}
            {step === 5 && 'Rutin ve planlama tarzın hakkında kısa bilgi ver.'}
          </p>

          {/* Step content — key triggers re-mount + fade-up animation */}
          <div key={step} className="animate-[fade-up_0.22s_ease-out]">

            {/* ── STEP 1: Uyku Düzeni ── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <p className="text-white/40 text-[11px] uppercase tracking-widest mb-3 font-medium">
                    Hafta İçi
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white/35 text-xs mb-1.5">Uyanma Saati</label>
                      <input
                        type="time"
                        value={form.weekdayWakeUp}
                        onChange={(e) => updateField('weekdayWakeUp', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-white/35 text-xs mb-1.5">Uyuma Saati</label>
                      <input
                        type="time"
                        value={form.weekdaySleep}
                        onChange={(e) => updateField('weekdaySleep', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-white/40 text-[11px] uppercase tracking-widest mb-3 font-medium">
                    Hafta Sonu
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white/35 text-xs mb-1.5">Uyanma Saati</label>
                      <input
                        type="time"
                        value={form.weekendWakeUp}
                        onChange={(e) => updateField('weekendWakeUp', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-white/35 text-xs mb-1.5">Uyuma Saati</label>
                      <input
                        type="time"
                        value={form.weekendSleep}
                        onChange={(e) => updateField('weekendSleep', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Sabit Bloklar ── */}
            {step === 2 && (
              <div className="space-y-3">
                {form.fixedBlocks.length === 0 && (
                  <p className="text-white/22 text-sm text-center py-2">
                    Henüz sabit blok eklenmedi.
                  </p>
                )}
                {form.fixedBlocks.map((block, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-[#0e0e15] border border-[#222230] rounded-xl px-3 py-2.5"
                  >
                    <span className="flex-1 text-white text-sm truncate">{block.title}</span>
                    <span className="text-white/35 text-xs shrink-0 font-mono tabular-nums">
                      {block.startTime} – {block.endTime}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBlock(i)}
                      className="text-white/25 hover:text-red-400 transition-colors ml-1 text-lg leading-none cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <div className="border-t border-[#1e1e28] pt-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Başlık (örn. İş, Okul)"
                    value={newBlock.title}
                    onChange={(e) => setNewBlock((b) => ({ ...b, title: e.target.value }))}
                    className={inputClass}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white/35 text-xs mb-1.5">Başlangıç</label>
                      <input
                        type="time"
                        value={newBlock.startTime}
                        onChange={(e) =>
                          setNewBlock((b) => ({ ...b, startTime: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-white/35 text-xs mb-1.5">Bitiş</label>
                      <input
                        type="time"
                        value={newBlock.endTime}
                        onChange={(e) =>
                          setNewBlock((b) => ({ ...b, endTime: e.target.value }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addBlock}
                    disabled={!newBlock.title.trim()}
                    className="w-full py-2.5 rounded-xl border border-[#28283f] text-white/45 hover:bg-[#14141e] hover:text-white/70 hover:border-[#383858] transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed text-sm cursor-pointer"
                  >
                    + Ekle
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Enerji Pikleri ── */}
            {step === 3 && (
              <div className="flex flex-wrap gap-2.5">
                {ENERGY_PEAKS.map((peak) => (
                  <button
                    key={peak}
                    type="button"
                    onClick={() => toggleEnergyPeak(peak)}
                    className={`${pillBase} ${
                      form.energyPeaks.includes(peak) ? pillActive : pillInactive
                    }`}
                  >
                    {peak}
                  </button>
                ))}
              </div>
            )}

            {/* ── STEP 4: Serbest Günler ── */}
            {step === 4 && (
              <div className="flex flex-wrap gap-2.5">
                {DAYS.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleFreeDay(value)}
                    className={`${pillBase} ${
                      form.freeDays.includes(value) ? pillActive : pillInactive
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* ── STEP 5: Rutin & Planlama ── */}
            {step === 5 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-white/35 text-xs mb-1.5">Hafta Sonu Rutinin</label>
                  <textarea
                    rows={4}
                    placeholder="Sabahları spor yapıyorum, öğleden sonra dinleniyorum..."
                    value={form.weekendRoutine}
                    onChange={(e) => updateField('weekendRoutine', e.target.value)}
                    className={`${inputClass} resize-none`}
                  />
                </div>
                <div>
                  <label className="block text-white/35 text-xs mb-1.5">Planlama Tarzın</label>
                  <textarea
                    rows={4}
                    placeholder="Esnek olmayı seviyorum, ama sabahları odaklanmak istiyorum..."
                    value={form.planningStyle}
                    onChange={(e) => updateField('planningStyle', e.target.value)}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="mt-4 text-red-400/85 text-sm text-center">{error}</p>
          )}

          {/* ── Navigation ── */}
          <div className="flex justify-between mt-8 gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 py-3 rounded-2xl border border-[#28283a] bg-[#111117] text-white/60 hover:bg-[#18181f] hover:text-white/85 transition-all duration-200 text-sm font-medium cursor-pointer"
              >
                Geri
              </button>
            ) : (
              <div className="flex-1" />
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="flex-1 py-3 rounded-2xl bg-violet-700 hover:bg-violet-600 text-white font-medium text-sm transition-all duration-200 cursor-pointer"
                style={{
                  boxShadow:
                    '0 0 24px rgba(109,40,217,0.28), 0 1px 4px rgba(0,0,0,0.5)',
                }}
              >
                İleri
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl bg-violet-700 hover:bg-violet-600 text-white font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  boxShadow:
                    '0 0 24px rgba(109,40,217,0.28), 0 1px 4px rgba(0,0,0,0.5)',
                }}
              >
                {submitting ? 'Haftalık şablonun oluşturuluyor...' : 'Başla'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
