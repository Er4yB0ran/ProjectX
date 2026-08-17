'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Validation Schema ───────────────────────────────────────────────────────

const CreateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Görev adı zorunludur')
    .max(200, 'Görev adı en fazla 200 karakter olabilir'),
  task_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçerli bir tarih girin'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  description: z.string().max(2000, 'Açıklama en fazla 2000 karakter olabilir').optional(),
  energy_cost: z.number().int().min(1).max(5).optional(),
})

export type CreateTaskData = z.infer<typeof CreateTaskSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** HTML <input type="time"> "HH:MM" değeri -> DB "HH:MM:SS". Boş/undefined -> null. */
function normalizeTime(t?: string | null): string | null {
  if (!t) return null
  return t.length === 5 ? `${t}:00` : t
}

/** Ortak path invalidasyonu — aynı veri hem /dashboard hem /tasks sayfasında görünüyor. */
function revalidateTaskPaths(): void {
  revalidatePath('/dashboard')
  revalidatePath('/tasks')
}

// ─── Server Actions ───────────────────────────────────────────────────────────

/**
 * Manuel görev oluşturur. `skeleton_block_id` kasıtlı olarak boş bırakılır —
 * bu, görevin haftalık şablondan değil kullanıcı tarafından elle eklendiğinin
 * tek göstergesidir (bkz. deleteTask silme kuralı).
 */
export async function createTask(data: CreateTaskData): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) throw new Error('Oturum açmanız gerekiyor')

  const parsed = CreateTaskSchema.parse(data)

  const { error } = await supabase.from('tasks').insert({
    user_id: user.id,
    title: parsed.title,
    task_date: parsed.task_date,
    original_date: parsed.task_date,
    start_time: normalizeTime(parsed.start_time),
    end_time: normalizeTime(parsed.end_time),
    description: parsed.description?.trim() || null,
    energy_cost: parsed.energy_cost ?? null,
  })

  if (error) throw new Error(`Görev eklenemedi: ${error.message}`)

  revalidateTaskPaths()
}

/**
 * Görev silme kuralı:
 *  - skeleton_block_id NULL (manuel görev) -> gerçekten sil (hard delete).
 *  - skeleton_block_id DOLU (şablondan türemiş görev) -> status='cancelled' (soft delete).
 *    Bunun nedeni: get_or_create_daily_tasks RPC'si bir günün şablonunun daha önce
 *    materialize edilip edilmediğini o gün için EN AZ BİR satır var mı diye kontrol
 *    ederek anlıyor. Şablon kökenli satırların tamamı hard-delete edilirse RPC o günü
 *    "hiç oluşturulmamış" sanıp şablonu yeniden oluşturur ve "silinen" görev geri gelir.
 */
export async function deleteTask(taskId: string): Promise<void> {
  if (!taskId) throw new Error('Geçersiz görev kimliği')

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) throw new Error('Oturum açmanız gerekiyor')

  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('skeleton_block_id')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !task) throw new Error('Görev bulunamadı')

  if (task.skeleton_block_id === null) {
    // Manuel görev -> hard delete
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id) // RLS double-check

    if (error) throw new Error(`Görev silinemedi: ${error.message}`)
  } else {
    // Şablon kökenli görev -> soft delete (cancelled)
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'cancelled' })
      .eq('id', taskId)
      .eq('user_id', user.id) // RLS double-check

    if (error) throw new Error(`Görev silinemedi: ${error.message}`)
  }

  revalidateTaskPaths()
}
