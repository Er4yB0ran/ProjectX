'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import type { TaskStatus } from '@/types/supabase'

const END_OF_DAY = 23 * 60 + 59 // 1439 dakika = 23:59
const MIN_DURATION = 15
const MAX_SEARCH_DAYS = 14 // ADIM 3'te en yakin uygun gunun aranacagi son gun (task_date + 14)

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(y, m - 1, d + days)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

function addOneDay(dateStr: string): string {
  return addDays(dateStr, 1)
}

/** Europe/Istanbul takviminde "bugün" tarihi ve şu anki saat (gün başından itibaren dakika). */
function nowIstanbul(): { dateStr: string; minutes: number } {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  const dateStr = `${map.year}-${map.month}-${map.day}`
  const hour = map.hour === '24' ? 0 : Number(map.hour) // bazi ICU implementasyonlari gece yarisi icin "24" doner
  const minutes = hour * 60 + Number(map.minute)
  return { dateStr, minutes }
}

interface Slot {
  start: number
  end: number
}

interface DayTaskRow {
  start_time: string | null
  end_time: string | null
}

/** Bir gundeki (excludeTaskId haric) saatli gorevleri saat sirasina gore ceker. */
async function fetchDayTasks(
  supabase: SupabaseServerClient,
  userId: string,
  date: string,
  excludeTaskId: string
): Promise<{ start_time: string; end_time: string }[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('start_time, end_time')
    .eq('user_id', userId)
    .eq('task_date', date)
    .neq('id', excludeTaskId)
    .not('start_time', 'is', null)
    .not('end_time', 'is', null)
    .order('start_time', { ascending: true })

  if (error) throw new Error(error.message)

  return ((data ?? []) as DayTaskRow[]).map((t) => ({
    start_time: t.start_time as string,
    end_time: t.end_time as string,
  }))
}

function overlapsAny(
  tasks: { start_time: string; end_time: string }[],
  start: number,
  end: number
): boolean {
  return tasks.some((t) => {
    const tStart = timeToMinutes(t.start_time)
    const tEnd = timeToMinutes(t.end_time)
    return tStart < end && tEnd > start
  })
}

/** searchStart'tan itibaren ilk yeterli buyuklukteki bosluk (mevcut "bosluk ara" algoritmasi). */
function firstFit(
  tasks: { start_time: string; end_time: string }[],
  duration: number,
  searchStart: number
): Slot | null {
  let freeStart = searchStart

  for (const t of tasks) {
    const tStart = timeToMinutes(t.start_time)
    const tEnd = timeToMinutes(t.end_time)

    if (tEnd <= freeStart) continue // bu gorev geride kaldi

    if (tStart > freeStart) {
      if (tStart - freeStart >= duration) {
        return { start: freeStart, end: freeStart + duration }
      }
      freeStart = tEnd
    } else {
      freeStart = Math.max(freeStart, tEnd)
    }
  }

  if (freeStart + duration <= END_OF_DAY) {
    return { start: freeStart, end: freeStart + duration }
  }

  return null
}

/**
 * Ortak slot arama yardimcisi: once gorevin ORIJINAL start_time'inin
 * [searchStart, END_OF_DAY] araliginda olup olmadigina ve bos olup olmadigina bakar
 * (varsa tercih edilir), yoksa searchStart'tan itibaren ilk yeterli bosluk aranir.
 */
async function findSlot(
  supabase: SupabaseServerClient,
  userId: string,
  date: string,
  duration: number,
  searchStart: number,
  excludeTaskId: string,
  preferredStart: number | null
): Promise<Slot | null> {
  const tasks = await fetchDayTasks(supabase, userId, date, excludeTaskId)

  if (
    preferredStart !== null &&
    preferredStart >= searchStart &&
    preferredStart + duration <= END_OF_DAY &&
    !overlapsAny(tasks, preferredStart, preferredStart + duration)
  ) {
    return { start: preferredStart, end: preferredStart + duration }
  }

  return firstFit(tasks, duration, searchStart)
}

/** O gundeki en buyuk bosluk (en az minDuration) — bolme icin part1 slotunu bulmakta kullanilir. */
async function findLargestGap(
  supabase: SupabaseServerClient,
  userId: string,
  date: string,
  minDuration: number,
  searchStart: number,
  excludeTaskId: string
): Promise<Slot | null> {
  const tasks = await fetchDayTasks(supabase, userId, date, excludeTaskId)

  let best: Slot | null = null
  let freeStart = searchStart

  const consider = (start: number, end: number) => {
    if (end - start >= minDuration && (!best || end - start > best.end - best.start)) {
      best = { start, end }
    }
  }

  for (const t of tasks) {
    const tStart = timeToMinutes(t.start_time)
    const tEnd = timeToMinutes(t.end_time)

    if (tEnd <= freeStart) continue

    if (tStart > freeStart) consider(freeStart, tStart)
    freeStart = Math.max(freeStart, tEnd)
  }
  consider(freeStart, END_OF_DAY)

  return best
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

/**
 * Görev erteleme algoritması — 3 kademeli arama:
 *  1. Aynı gün içinde (şu andan itibaren) boş slot ara.
 *  2. Ertesi gün boş slot ara.
 *  3. Ertesi günde tam sığmıyorsa ve görev esnekse (flexibility_score >= 4),
 *     görevi ikiye bölmeyi dene: 1. parça ertesi güne, 2. parça yarın-sonrasına.
 *  4. Bölme mümkün değilse veya başarısız olursa, en yakın uygun günü ara
 *     (yarın-sonrasından başlayarak 14 gün ileriye kadar, bölmeden).
 *  5. Hiçbiri olmazsa görev iptal edilir.
 */
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

    // 3. Saat bilgisi olmayan görev → çakışma söz konusu olamaz, doğrudan ertesi güne taşı
    if (task.start_time === null || task.end_time === null) {
      const { error } = await supabase
        .from('tasks')
        .update({ task_date: addOneDay(task.task_date), status: 'rescheduled' })
        .eq('id', taskId)
      if (error) throw new Error(error.message)
      revalidatePath('/dashboard')
      return
    }

    const duration = timeToMinutes(task.end_time) - timeToMinutes(task.start_time)
    const originalStart = timeToMinutes(task.start_time)
    const canSplit = task.flexibility_score >= 4

    async function commitMove(date: string, slot: Slot): Promise<void> {
      const { error } = await supabase
        .from('tasks')
        .update({
          task_date: date,
          start_time: minutesToTime(slot.start),
          end_time: minutesToTime(slot.end),
          status: 'rescheduled',
        })
        .eq('id', taskId)
      if (error) throw new Error(error.message)
      revalidatePath('/dashboard')
    }

    // ADIM 1 — Aynı gün
    const { dateStr: todayStr, minutes: nowMinutes } = nowIstanbul()
    const sameDaySearchStart = task.task_date === todayStr ? nowMinutes : 0

    const sameDaySlot = await findSlot(
      supabase,
      task.user_id,
      task.task_date,
      duration,
      sameDaySearchStart,
      taskId,
      null // orijinal slot burada tercih edilmemeli — aynı gün içinde erteleme, aynı slota "no-op" düşmesin
    )
    if (sameDaySlot) {
      await commitMove(task.task_date, sameDaySlot)
      return
    }

    // ADIM 2 — Ertesi gün
    const nextDay = addOneDay(task.task_date)
    const nextDaySlot = await findSlot(supabase, task.user_id, nextDay, duration, 0, taskId, originalStart)
    if (nextDaySlot) {
      await commitMove(nextDay, nextDaySlot)
      return
    }

    const dayAfter = addOneDay(nextDay)

    // Bölme ihtimali — sadece görev yeterince esnekse ve süresi bölünmeye uygunsa
    if (canSplit && duration > MIN_DURATION) {
      const gap = await findLargestGap(supabase, task.user_id, nextDay, MIN_DURATION, 0, taskId)

      if (gap) {
        const gapSize = gap.end - gap.start
        const part1Duration = Math.min(gapSize, duration - MIN_DURATION)
        const part2Duration = duration - part1Duration

        const slot2 = await findSlot(
          supabase,
          task.user_id,
          dayAfter,
          part2Duration,
          0,
          taskId,
          originalStart
        )

        if (slot2) {
          const part1Slot: Slot = { start: gap.start, end: gap.start + part1Duration }

          // Mevcut görevi 1. parça olarak güncelle
          const { error: updateError } = await supabase
            .from('tasks')
            .update({
              task_date: nextDay,
              start_time: minutesToTime(part1Slot.start),
              end_time: minutesToTime(part1Slot.end),
              status: 'rescheduled',
              title: `${task.title} (1/2)`,
            })
            .eq('id', taskId)
          if (updateError) throw new Error(updateError.message)

          // 2. parçayı yeni bir satır olarak ekle
          const { data: inserted, error: insertError } = await supabase
            .from('tasks')
            .insert({
              user_id: task.user_id,
              skeleton_block_id: task.skeleton_block_id,
              title: `${task.title} (2/2)`,
              description: task.description,
              energy_cost: task.energy_cost,
              flexibility_score: task.flexibility_score,
              // original_date trigger tarafından task_date'e eşitlenip aşağıda düzeltilecek;
              // burada yalnızca NOT NULL kısıtını + Insert tipini karşılamak için veriliyor.
              original_date: dayAfter,
              task_date: dayAfter,
              start_time: minutesToTime(slot2.start),
              end_time: minutesToTime(slot2.end),
              status: 'rescheduled',
              linked_task_id: taskId,
            })
            .select('id')
            .single()

          if (insertError) throw new Error(insertError.message)

          // set_task_original_date trigger'ı INSERT'te original_date'i task_date'e (dayAfter)
          // eşitledi — bölünen görevin GERÇEK ilk tarihini (original_date) korumak için düzelt,
          // aksi halde arşiv sayfasındaki gün gruplaması bozulur.
          if (inserted) {
            const { error: fixError } = await supabase
              .from('tasks')
              .update({ original_date: task.original_date })
              .eq('id', inserted.id)
            if (fixError) throw new Error(fixError.message)
          }

          revalidatePath('/dashboard')
          return
        }
        // slot2 bulunamadı → bölmeyi iptal et, ADIM 3'e düş
      }
    }

    // ADIM 3 — En yakın uygun gün (bölmeden), dayAfter'dan başlayarak task.task_date + 14 güne kadar
    for (let offset = 2; offset <= MAX_SEARCH_DAYS; offset++) {
      const day = addDays(task.task_date, offset)
      const slot = await findSlot(supabase, task.user_id, day, duration, 0, taskId, originalStart)
      if (slot) {
        await commitMove(day, slot)
        return
      }
    }

    // ADIM 4 — Hiçbiri olmadı
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'cancelled' })
      .eq('id', taskId)
    if (error) throw new Error(error.message)
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
