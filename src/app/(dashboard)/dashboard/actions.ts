'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TaskStatus } from '@/types/supabase'

const END_OF_DAY = 23 * 60 + 59 // 1439 dakika = 23:59
const MIN_DURATION = 15

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

function addOneDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(y, m - 1, d + 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}

export async function rescheduleTask(taskId: string) {
  const supabase = await createClient()

  try {
    // 1. Görevi ve bağlı skeleton_block kısıtlarını çek
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*, skeleton_blocks(is_hard_constraint, flexibility_score)')
      .eq('id', taskId)
      .single()

    if (taskError || !task) throw new Error('Görev bulunamadı')

    const block = task.skeleton_blocks as unknown as {
      is_hard_constraint: boolean
      flexibility_score: number
    } | null

    // 2. Sabit görev kontrolü
    if (block?.is_hard_constraint === true || task.flexibility_score === 1) {
      throw new Error('Sabit görevler ertelenemez')
    }

    // 3. Yarınki tarih
    const tomorrowStr = addOneDay(task.task_date)

    // 4. Saat bilgisi olmayan görev → sadece tarih + status güncelle
    if (task.start_time === null || task.end_time === null) {
      const { error } = await supabase
        .from('tasks')
        .update({ task_date: tomorrowStr, status: 'rescheduled' })
        .eq('id', taskId)
      if (error) throw new Error(error.message)
      revalidatePath('/dashboard')
      return
    }

    // 5. Görevin süresi (dakika)
    const duration = timeToMinutes(task.end_time) - timeToMinutes(task.start_time)
    const targetStart = timeToMinutes(task.start_time)
    const targetEnd = targetStart + duration

    // 6. Yarının görevlerini saat sırasına göre çek
    const { data: tomorrowTasks, error: tomorrowError } = await supabase
      .from('tasks')
      .select('start_time, end_time')
      .eq('user_id', task.user_id)
      .eq('task_date', tomorrowStr)
      .not('start_time', 'is', null)
      .not('end_time', 'is', null)
      .order('start_time', { ascending: true })

    if (tomorrowError) throw new Error(tomorrowError.message)

    const tomorrow = tomorrowTasks ?? []

    // 7. Orijinal saatte çakışma var mı?
    const hasOverlap = tomorrow.some((t) => {
      const tStart = timeToMinutes(t.start_time!)
      const tEnd = timeToMinutes(t.end_time!)
      return tStart < targetEnd && tEnd > targetStart
    })

    // Varsayılan: orijinal saat (çakışma yoksa burası kullanılır)
    let candidateStart = targetStart
    let candidateEnd = targetEnd

    if (hasOverlap) {
      // İlk uygun boşluğu targetStart'tan itibaren ara
      let freeStart = targetStart

      let placed = false
      for (const t of tomorrow) {
        const tStart = timeToMinutes(t.start_time!)
        const tEnd = timeToMinutes(t.end_time!)

        if (tEnd <= freeStart) continue // bu görev geride kaldı

        if (tStart > freeStart) {
          // Aradaki boşluk yeterli mi?
          if (tStart - freeStart >= duration) {
            candidateStart = freeStart
            candidateEnd = freeStart + duration
            placed = true
            break
          } else {
            freeStart = tEnd
          }
        } else {
          // Görev freeStart ile örtüşüyor
          freeStart = Math.max(freeStart, tEnd)
        }
      }

      if (!placed) {
        // Tüm görevlerin ardına yerleştir
        candidateStart = freeStart
        candidateEnd = freeStart + duration
      }
    }

    // 8. Yerleşim kararı
    let newStartTime: string
    let newEndTime: string
    let newStatus: TaskStatus

    if (candidateEnd <= END_OF_DAY) {
      newStartTime = minutesToTime(candidateStart)
      newEndTime = minutesToTime(candidateEnd)
      newStatus = 'rescheduled'
    } else if (task.flexibility_score >= 4) {
      const available = END_OF_DAY - candidateStart
      if (available >= MIN_DURATION) {
        // Tıraşla
        newStartTime = minutesToTime(candidateStart)
        newEndTime = minutesToTime(END_OF_DAY)
        newStatus = 'rescheduled'
      } else {
        const { error } = await supabase
          .from('tasks')
          .update({ status: 'cancelled' })
          .eq('id', taskId)
        if (error) throw new Error(error.message)
        revalidatePath('/dashboard')
        return
      }
    } else {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'cancelled' })
        .eq('id', taskId)
      if (error) throw new Error(error.message)
      revalidatePath('/dashboard')
      return
    }

    // 9. Güncelle
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        task_date: tomorrowStr,
        start_time: newStartTime,
        end_time: newEndTime,
        status: newStatus,
      })
      .eq('id', taskId)

    if (updateError) throw new Error(updateError.message)

    revalidatePath('/dashboard')
  } catch (err) {
    if (err instanceof Error) throw err
    throw new Error('Görev ertelenirken beklenmeyen bir hata oluştu')
  }
}
