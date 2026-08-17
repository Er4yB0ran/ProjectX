import { z } from 'zod'

export const DAY_NAMES = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
] as const

export const BlockSchema = z.object({
  title: z.string().min(1, 'Görev adı zorunludur').max(200, 'Görev adı en fazla 200 karakter olabilir'),
  day_of_week: z.number().int().min(0).max(6),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Geçerli bir saat formatı girin (SS:DD)'),
  end_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Geçerli bir saat formatı girin (SS:DD)'),
  is_hard_constraint: z.boolean(),
  energy_cost: z.number().int().min(1).max(5),
  flexibility_score: z.number().int().min(1).max(5),
})

export type BlockFormData = z.infer<typeof BlockSchema>

/** HTML <input type="time"> produces "HH:MM" — DB needs "HH:MM:SS" */
export function normalizeTime(t: string): string {
  return t.length === 5 ? `${t}:00` : t
}

/**
 * Core logic rule: is_hard_constraint = true → flexibility_score is always 1.
 * Enforce here in case client bypasses the UI restriction.
 */
export function applyBusinessRules<T extends { is_hard_constraint: boolean; flexibility_score: number }>(
  data: T
): T {
  if (data.is_hard_constraint) {
    return { ...data, flexibility_score: 1 }
  }
  return data
}

/** Blokları gün indeksine (0=Pazartesi..6=Pazar) göre gruplar, her grubu saate göre sıralar. */
export function groupBlocksByDay<T extends { day_of_week: number; start_time: string }>(
  blocks: T[]
): T[][] {
  return DAY_NAMES.map((_, i) =>
    blocks.filter((b) => b.day_of_week === i).sort((a, b) => a.start_time.localeCompare(b.start_time))
  )
}
