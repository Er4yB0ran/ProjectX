'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Validation Schema ───────────────────────────────────────────────────────

const BlockSchema = z.object({
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** HTML <input type="time"> produces "HH:MM" — DB needs "HH:MM:SS" */
function normalizeTime(t: string): string {
  return t.length === 5 ? `${t}:00` : t
}

/**
 * Core logic rule: is_hard_constraint = true → flexibility_score is always 1.
 * Enforce here in case client bypasses the UI restriction.
 */
function applyBusinessRules(data: BlockFormData): BlockFormData {
  if (data.is_hard_constraint) {
    return { ...data, flexibility_score: 1 }
  }
  return data
}

// ─── Server Actions ───────────────────────────────────────────────────────────

export async function createTemplateBlock(data: BlockFormData): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) throw new Error('Oturum açmanız gerekiyor')

  const parsed = applyBusinessRules(BlockSchema.parse(data))

  const { error } = await supabase.from('skeleton_blocks').insert({
    user_id: user.id,
    title: parsed.title,
    day_of_week: parsed.day_of_week,
    start_time: normalizeTime(parsed.start_time),
    end_time: normalizeTime(parsed.end_time),
    is_hard_constraint: parsed.is_hard_constraint,
    energy_cost: parsed.energy_cost,
    flexibility_score: parsed.flexibility_score,
  })

  if (error) throw new Error(`Blok eklenemedi: ${error.message}`)

  revalidatePath('/template')
  revalidatePath('/dashboard')
}

export async function updateTemplateBlock(id: string, data: BlockFormData): Promise<void> {
  if (!id) throw new Error('Geçersiz blok kimliği')

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) throw new Error('Oturum açmanız gerekiyor')

  const parsed = applyBusinessRules(BlockSchema.parse(data))

  const { error } = await supabase
    .from('skeleton_blocks')
    .update({
      title: parsed.title,
      day_of_week: parsed.day_of_week,
      start_time: normalizeTime(parsed.start_time),
      end_time: normalizeTime(parsed.end_time),
      is_hard_constraint: parsed.is_hard_constraint,
      energy_cost: parsed.energy_cost,
      flexibility_score: parsed.flexibility_score,
    })
    .eq('id', id)
    .eq('user_id', user.id) // RLS double-check: sadece kendi bloğunu güncelleyebilir

  if (error) throw new Error(`Blok güncellenemedi: ${error.message}`)

  revalidatePath('/template')
  revalidatePath('/dashboard')
}

export async function deleteTemplateBlock(id: string): Promise<void> {
  if (!id) throw new Error('Geçersiz blok kimliği')

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) throw new Error('Oturum açmanız gerekiyor')

  const { error } = await supabase
    .from('skeleton_blocks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) // RLS double-check

  if (error) throw new Error(`Blok silinemedi: ${error.message}`)

  revalidatePath('/template')
  revalidatePath('/dashboard')
}
