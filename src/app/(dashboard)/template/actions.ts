'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { BlockSchema, applyBusinessRules, normalizeTime, type BlockFormData } from '@/lib/skeletonBlock'

export type { BlockFormData }

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
