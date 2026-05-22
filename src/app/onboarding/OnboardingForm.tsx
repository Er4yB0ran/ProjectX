'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

export default function OnboardingForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<OnboardingFormState>(INITIAL_STATE)
  const [newBlock, setNewBlock] = useState<FixedBlock>(INITIAL_BLOCK)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        router.push('/dashboard')
      } else {
        const data = await res.json()
        setError(data.error ?? 'Bir hata oluştu, lütfen tekrar deneyin.')
      }
    } catch {
      setError('Bağlantı hatası, lütfen tekrar deneyin.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-white/30 transition-all'

  const pillBase = 'px-4 py-2 rounded-full border text-sm font-medium transition-all duration-150 cursor-pointer select-none'
  const pillActive = 'bg-purple-500/30 border-purple-400/50 shadow-lg shadow-purple-500/20 text-white'
  const pillInactive = 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:text-white/80'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center justify-center mb-8 gap-0">
          {STEP_TITLES.map((title, i) => {
            const n = i + 1
            const isActive = n === step
            const isDone = n < step
            return (
              <div key={n} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/40'
                        : isDone
                        ? 'bg-purple-500/50 text-white/80'
                        : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {isDone ? '✓' : n}
                  </div>
                  <span
                    className={`text-[10px] hidden sm:block transition-all ${
                      isActive ? 'text-purple-300' : isDone ? 'text-white/40' : 'text-white/20'
                    }`}
                  >
                    {title}
                  </span>
                </div>
                {i < STEP_TITLES.length - 1 && (
                  <div
                    className={`h-px w-8 sm:w-12 mx-1 mb-4 transition-all ${
                      isDone ? 'bg-purple-500/50' : 'bg-white/10'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-8">
          <h2 className="text-xl font-semibold text-white mb-1">{STEP_TITLES[step - 1]}</h2>
          <p className="text-white/40 text-sm mb-6">
            {step === 1 && 'Günlük uyku rutinini belirle.'}
            {step === 2 && 'Esnetemeyeceğin sabit bloklarını ekle.'}
            {step === 3 && 'En verimli olduğun saatleri seç.'}
            {step === 4 && 'Serbest olan günlerini belirt.'}
            {step === 5 && 'Rutin ve planlama tarzın hakkında kısa bilgi ver.'}
          </p>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Hafta İçi</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/50 text-xs mb-1.5">Uyanma Saati</label>
                    <input
                      type="time"
                      value={form.weekdayWakeUp}
                      onChange={(e) => updateField('weekdayWakeUp', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-white/50 text-xs mb-1.5">Uyuma Saati</label>
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
                <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Hafta Sonu</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/50 text-xs mb-1.5">Uyanma Saati</label>
                    <input
                      type="time"
                      value={form.weekendWakeUp}
                      onChange={(e) => updateField('weekendWakeUp', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-white/50 text-xs mb-1.5">Uyuma Saati</label>
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

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              {form.fixedBlocks.length === 0 && (
                <p className="text-white/30 text-sm text-center py-2">
                  Henüz sabit blok eklenmedi.
                </p>
              )}
              {form.fixedBlocks.map((block, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5"
                >
                  <span className="flex-1 text-white text-sm truncate">{block.title}</span>
                  <span className="text-white/40 text-xs shrink-0">
                    {block.startTime} – {block.endTime}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeBlock(i)}
                    className="text-white/30 hover:text-red-400 transition-colors ml-1 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}

              <div className="border-t border-white/10 pt-4 space-y-3">
                <input
                  type="text"
                  placeholder="Başlık (örn. İş, Okul)"
                  value={newBlock.title}
                  onChange={(e) => setNewBlock((b) => ({ ...b, title: e.target.value }))}
                  className={inputClass}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/50 text-xs mb-1.5">Başlangıç</label>
                    <input
                      type="time"
                      value={newBlock.startTime}
                      onChange={(e) => setNewBlock((b) => ({ ...b, startTime: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-white/50 text-xs mb-1.5">Bitiş</label>
                    <input
                      type="time"
                      value={newBlock.endTime}
                      onChange={(e) => setNewBlock((b) => ({ ...b, endTime: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addBlock}
                  disabled={!newBlock.title.trim()}
                  className="w-full py-2.5 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                >
                  + Ekle
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="flex flex-wrap gap-2.5">
              {ENERGY_PEAKS.map((peak) => (
                <button
                  key={peak}
                  type="button"
                  onClick={() => toggleEnergyPeak(peak)}
                  className={`${pillBase} ${form.energyPeaks.includes(peak) ? pillActive : pillInactive}`}
                >
                  {peak}
                </button>
              ))}
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="flex flex-wrap gap-2.5">
              {DAYS.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleFreeDay(value)}
                  className={`${pillBase} ${form.freeDays.includes(value) ? pillActive : pillInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <label className="block text-white/50 text-xs mb-1.5">Hafta Sonu Rutinin</label>
                <textarea
                  rows={4}
                  placeholder="Sabahları spor yapıyorum, öğleden sonra dinleniyorum..."
                  value={form.weekendRoutine}
                  onChange={(e) => updateField('weekendRoutine', e.target.value)}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs mb-1.5">Planlama Tarzın</label>
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

          {/* Error */}
          {error && (
            <p className="mt-4 text-red-400/80 text-sm text-center">{error}</p>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 py-3 rounded-2xl border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-all text-sm font-medium"
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
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-500/80 to-blue-500/80 hover:from-purple-500 hover:to-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-purple-500/20"
              >
                İleri
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-500/80 to-blue-500/80 hover:from-purple-500 hover:to-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-purple-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
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
