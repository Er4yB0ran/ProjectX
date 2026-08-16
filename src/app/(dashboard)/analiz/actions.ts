'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { analyzeBehavior, buildProductivityHeatmap } from '@/lib/analytics'

// ─── Sabitler ────────────────────────────────────────────────────────────────

const DAY_NAMES: Record<number, string> = {
  0: 'Pazartesi',
  1: 'Salı',
  2: 'Çarşamba',
  3: 'Perşembe',
  4: 'Cuma',
  5: 'Cumartesi',
  6: 'Pazar',
}

const MIN_RESOLVED_FOR_SUGGESTIONS = 10

// ─── Zod şeması ──────────────────────────────────────────────────────────────

const suggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        skeleton_block_id: z.string(),
        field: z.enum(['day_of_week', 'start_time', 'end_time']),
        suggested_value: z.string(),
        rationale: z.string(),
      })
    )
    .max(5),
})

// ─── Prompt ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Sen bir sistem yoneticisisin. Kullanicinin gecmis gorev verilerini analiz ederek haftalik sablonunda (skeleton_blocks) somut degisiklik onerileri uretiyorsun. Ton: kisa, net, mekanik. Klise veya duygusal ifade kullanma. Asla emoji kullanma. Turkce yaz.

Kurallar:
- En fazla 5 oneri uret. Veri zayifsa daha az oneri uret veya hic oneri uretme.
- skeleton_block_id alaninda SADECE sana verilen listedeki id'lerden birini AYNEN kullan. Baska bir id uydurma.
- Her oneride field alanindan SADECE biri degissin: day_of_week, start_time veya end_time. Ayni oneride birden fazla alani degistirme.
- day_of_week degeri "0"-"6" arasinda bir string olmali (0=Pazartesi ... 6=Pazar). start_time/end_time "HH:MM" formatinda olmali.
- rationale alaninda, onerinin hangi veriye dayandigini belirten tek bir cumle yaz.
- Sadece belirgin, veriyle desteklenen orunturler icin oneri uret. Zayif veya tek seferlik sinyallere dayanarak oneri uretme.`

function buildUserPrompt(params: {
  buckets: ReturnType<typeof analyzeBehavior>['buckets']
  heatmap: ReturnType<typeof buildProductivityHeatmap>
  worstTitles: ReturnType<typeof analyzeBehavior>['worstTitles']
  blocks: Array<{
    id: string
    title: string
    day_of_week: number
    start_time: string
    end_time: string
  }>
}): string {
  const { buckets, heatmap, worstTitles, blocks } = params

  const bucketLines = buckets
    .filter((b) => b.total > 0)
    .map((b) => `  - ${b.label}: %${Math.round((b.rate ?? 0) * 100)} basari (${b.total} gorev)`)
    .join('\n')

  const heatmapLines = heatmap
    .flat()
    .filter((cell) => cell.total > 0)
    .map((cell) => `  - ${cell.dayLabel} ${cell.bucketLabel}: %${Math.round((cell.rate ?? 0) * 100)} basari (${cell.total} gorev)`)
    .join('\n')

  const worstLines = worstTitles
    .map(
      (t) =>
        `  - "${t.title}": ${t.completed} tamamlandi, ${t.rescheduled} ertelendi, ${t.cancelled} iptal (toplam ${t.total})`
    )
    .join('\n')

  const blockLines = blocks
    .map((b) => `  - [${b.id}]: "${b.title}" — ${DAY_NAMES[b.day_of_week] ?? b.day_of_week} ${b.start_time.slice(0, 5)}-${b.end_time.slice(0, 5)}`)
    .join('\n')

  return `Saat dilimine gore basari oranlari:
${bucketLines || '  (veri yok)'}

Gun x saat dilimi kirilimda basari oranlari (sadece dolu hucreler):
${heatmapLines || '  (veri yok)'}

En cok aksayan gorev basliklari:
${worstLines || '  (belirgin bir orunta yok)'}

Kullanicinin degistirilebilir sablon bloklari (id ile birlikte, sadece bunlardan birini oner):
${blockLines || '  (yok)'}`
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

/** HTML <input type="time"> "HH:MM" uretir, DB "HH:MM:SS" bekler */
function normalizeTime(t: string): string {
  return t.length === 5 ? `${t}:00` : t
}

// ─── Server Actions ────────────────────────────────────────────────────────────

export async function generateSkeletonSuggestions(): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) throw new Error('Oturum açmanız gerekiyor')

  const [{ data: tasks }, { data: blocks }] = await Promise.all([
    supabase
      .from('tasks')
      .select('title, status, start_time, task_date')
      .eq('user_id', user.id),
    supabase
      .from('skeleton_blocks')
      .select('id, title, day_of_week, start_time, end_time, energy_cost, flexibility_score, is_hard_constraint')
      .eq('user_id', user.id),
  ])

  const analysis = analyzeBehavior(tasks ?? [])
  const heatmap = buildProductivityHeatmap(tasks ?? [])

  if (analysis.totalResolved < MIN_RESOLVED_FOR_SUGGESTIONS) {
    throw new Error(
      `Öneri üretmek için yeterli veri yok, en az ${MIN_RESOLVED_FOR_SUGGESTIONS} sonuçlanmış görev gerekiyor`
    )
  }

  const flexibleBlocks = (blocks ?? []).filter((b) => !b.is_hard_constraint)

  if (flexibleBlocks.length === 0) {
    throw new Error('Şablonunuzda önerilebilecek esnek bir blok yok')
  }

  const userPrompt = buildUserPrompt({
    buckets: analysis.buckets,
    heatmap,
    worstTitles: analysis.worstTitles,
    blocks: flexibleBlocks,
  })

  let result: z.infer<typeof suggestionSchema>
  try {
    const { object } = await generateObject({
      model: anthropic('claude-haiku-4-5-20251001'),
      schema: suggestionSchema,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    })
    result = object
  } catch (err) {
    console.error('[analiz] generateObject error:', err instanceof Error ? err.message : err)
    throw new Error('Öneriler oluşturulamadı, lütfen tekrar deneyin')
  }

  // Guvenlik suzgeci: AI'nin dondurdugu skeleton_block_id gercekten
  // bu kullanicinin kendi (ve is_hard_constraint=false) bloklarindan biri mi?
  const flexibleBlockMap = new Map(flexibleBlocks.map((b) => [b.id, b]))
  const validSuggestions = result.suggestions.filter((s) => flexibleBlockMap.has(s.skeleton_block_id))

  // Eskiyen bekleyen onerileri temizle
  const { error: dismissError } = await supabase
    .from('skeleton_suggestions')
    .update({ status: 'dismissed' })
    .eq('user_id', user.id)
    .eq('status', 'pending')

  if (dismissError) throw new Error(`Eski öneriler temizlenemedi: ${dismissError.message}`)

  if (validSuggestions.length > 0) {
    const rows = validSuggestions.map((s) => {
      const block = flexibleBlockMap.get(s.skeleton_block_id)!
      const currentValue =
        s.field === 'day_of_week'
          ? String(block.day_of_week)
          : s.field === 'start_time'
            ? block.start_time
            : block.end_time

      return {
        user_id: user.id,
        skeleton_block_id: s.skeleton_block_id,
        field: s.field,
        current_value: currentValue,
        suggested_value: s.suggested_value,
        rationale: s.rationale,
        status: 'pending' as const,
      }
    })

    const { error: insertError } = await supabase.from('skeleton_suggestions').insert(rows)
    if (insertError) throw new Error(`Öneriler kaydedilemedi: ${insertError.message}`)
  }

  revalidatePath('/analiz')
}

export async function acceptSuggestion(suggestionId: string): Promise<void> {
  if (!suggestionId) throw new Error('Geçersiz öneri kimliği')

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) throw new Error('Oturum açmanız gerekiyor')

  const { data: suggestion, error: fetchError } = await supabase
    .from('skeleton_suggestions')
    .select('id, skeleton_block_id, field, suggested_value, status')
    .eq('id', suggestionId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !suggestion) throw new Error('Öneri bulunamadı')
  if (suggestion.status !== 'pending') throw new Error('Bu öneri artık geçerli değil')

  const blockUpdate =
    suggestion.field === 'day_of_week'
      ? { day_of_week: Number(suggestion.suggested_value) }
      : suggestion.field === 'start_time'
        ? { start_time: normalizeTime(suggestion.suggested_value) }
        : { end_time: normalizeTime(suggestion.suggested_value) }

  const { error: updateError } = await supabase
    .from('skeleton_blocks')
    .update(blockUpdate)
    .eq('id', suggestion.skeleton_block_id)
    .eq('user_id', user.id)

  if (updateError) throw new Error(`Blok güncellenemedi: ${updateError.message}`)

  const { error: statusError } = await supabase
    .from('skeleton_suggestions')
    .update({ status: 'accepted' })
    .eq('id', suggestionId)
    .eq('user_id', user.id)

  if (statusError) throw new Error(`Öneri güncellenemedi: ${statusError.message}`)

  revalidatePath('/analiz')
  revalidatePath('/template')
  revalidatePath('/dashboard')
}

export async function dismissSuggestion(suggestionId: string): Promise<void> {
  if (!suggestionId) throw new Error('Geçersiz öneri kimliği')

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) throw new Error('Oturum açmanız gerekiyor')

  const { error } = await supabase
    .from('skeleton_suggestions')
    .update({ status: 'dismissed' })
    .eq('id', suggestionId)
    .eq('user_id', user.id)

  if (error) throw new Error(`Öneri reddedilemedi: ${error.message}`)

  revalidatePath('/analiz')
}
