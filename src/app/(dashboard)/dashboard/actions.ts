'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
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

export async function closeDayAndReflect(): Promise<{ ai_message: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Oturum acik degil')

  const todayStr = new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Istanbul' }).format(new Date())

  // Bugune ait kayit zaten varsa yeniden uretme
  const { data: existing } = await supabase
    .from('daily_reflections')
    .select('ai_message')
    .eq('user_id', user.id)
    .eq('reflection_date', todayStr)
    .maybeSingle()

  if (existing) return { ai_message: existing.ai_message }

  // Bugunun gorevlerini cek (original_date ile: ertelenenler dahil tum bugun gorevleri)
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('title, status')
    .eq('user_id', user.id)
    .eq('original_date', todayStr)

  if (tasksError) throw new Error(tasksError.message)

  const allTasks = tasks ?? []
  const completedTasks = allTasks.filter((t) => t.status === 'completed')
  const incompleteTasks = allTasks.filter(
    (t) => t.status === 'rescheduled' || t.status === 'cancelled' || t.status === 'pending'
  )

  const fmt = (list: { title: string }[]) =>
    list.length > 0 ? list.map((t) => `- ${t.title}`).join('\n') : '(yok)'

  const systemPrompt = `Sen bir sistem yoneticisisin. Kullanicinin zihinsel yukunu devralan, "ben hallettim" guveni veren, keskin ve mekanik bir yapay zekasın. Asla duygusal, motive edici veya teselli edici bir dil kullanma. Asla "harika is cikardin", "dinlenmeyi hak ettin", "uzulme" gibi klise ifadeler kullanma. Ton: kisa, net, soguk degil ama mekanik. Asla emoji kullanma. Turkce yaz.`

  const userPrompt = `Bugunun gorev ozeti:

Tamamlanan gorevler:
${fmt(completedTasks)}

Eksik kalan gorevler (ertelenen, iptal edilen veya beklemede):
${fmt(incompleteTasks)}

Tamamlanan gorevleri tek ve net bir cumleyle ozetle. Ardindan eksik kalanlar icin su anlama gelen, ama kendi cumlelerinle ifade ettigin mekanik ve guven veren bir kapatma cumleleri yaz: "Eksik kalan gorevleri onumuzdeki uygun bosluklara entegre ettim. Yeni programin hazir, goz atip zihnini kapatabilirsin." Toplam mesaj 3 cumleti gecmesin.`

  const { text } = await generateText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: systemPrompt,
    prompt: userPrompt,
  })

  const aiMessage = text.trim()

  const { error: insertError } = await supabase
    .from('daily_reflections')
    .insert({
      user_id: user.id,
      reflection_date: todayStr,
      ai_message: aiMessage,
    })

  if (insertError) throw new Error(insertError.message)

  revalidatePath('/dashboard')
  return { ai_message: aiMessage }
}
