import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES } from '@/lib/skeletonBlock'
import { AI_CHAT_TOKEN_BUDGET } from '@/lib/aiChatConfig'

/**
 * Anthropic'in structured output'u JSON şemasında birçok yaygın kısıtı desteklemiyor:
 * 'number' tipinde min/max, 'array' tipinde maxItems, ve discriminatedUnion'ın ürettiği
 * 'oneOf'. Bu yüzden şema tamamen düz (flat) tutuluyor — hem patch operasyonu hem de
 * sınır/temizlik burada, kod tarafında yapılıyor.
 */
function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)))
}

const patchOperationSchema = z.object({
  op: z.enum(['add', 'update', 'delete']),
  block_id: z.string().optional(),
  day_of_week: z.number().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  title: z.string().optional(),
  is_hard_constraint: z.boolean().optional(),
  energy_cost: z.number().optional(),
  flexibility_score: z.number().optional(),
})

const editSkeletonSchema = z.object({
  is_relevant: z.boolean(),
  rejection_reason: z.string().optional(),
  needs_clarification: z.boolean(),
  clarification_question: z.string().optional(),
  ambiguous_block_ids: z.array(z.string()).optional(),
  patch: z.array(patchOperationSchema),
})

const draftBlockSchema = z.object({
  client_id: z.string(),
  day_of_week: z.number(),
  start_time: z.string(),
  end_time: z.string(),
  title: z.string(),
  is_hard_constraint: z.boolean(),
  energy_cost: z.number(),
  flexibility_score: z.number(),
})

const requestSchema = z.object({
  sessionId: z.string(),
  blocks: z.array(draftBlockSchema),
  turns: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })),
  message: z.string().min(1),
})

interface BlockFields {
  day_of_week: number
  start_time: string
  end_time: string
  title: string
  is_hard_constraint: boolean
  energy_cost: number
  flexibility_score: number
}

type CleanPatchOperation =
  | { op: 'add'; block: BlockFields }
  | { op: 'update'; block_id: string; fields: Partial<BlockFields> }
  | { op: 'delete'; block_id: string }

const SYSTEM_PROMPT = `Sen kullanıcının haftalık iskeletini (skeleton_blocks taslağı) sohbet yoluyla düzenlemesine yardım eden bir asistansın. Her mesajda sana o anki taslağın tamamı (id'leriyle) veriliyor.

Kurallar:
- day_of_week: 0=Pazartesi, 1=Salı, 2=Çarşamba, 3=Perşembe, 4=Cuma, 5=Cumartesi, 6=Pazar
- start_time / end_time: "HH:MM:SS" formatında
- is_hard_constraint: true olan bloklarda flexibility_score her zaman 1 olmalı
- energy_cost ve flexibility_score 1-5 arası tam sayı

Her mesajda şu üç durumdan TAM OLARAK BİRİNİ seç:

1. **Alakasız mesaj**: Kullanıcının isteği iskeletle/haftalık planla hiç ilgili değilse (örn. hava durumu sormak), is_relevant=false yap, rejection_reason'a kısa nazik bir Türkçe açıklama yaz, patch'i boş bırak.

2. **Belirsiz istek**: Kullanıcı hangi bloğu kastettiğini netleştirmeden genel bir şey söylerse ("beğenmedim", "değiştir" gibi — hangi blok belli değilse), is_relevant=true, needs_clarification=true yap, clarification_question'a kısa bir soru yaz, ambiguous_block_ids'e olası aday blokların id'lerini koy, patch'i boş bırak. TAHMİN YÜRÜTME, SORU SOR.

3. **Net istek**: Kullanıcının ne istediği açıksa, is_relevant=true, needs_clarification=false yap ve SADECE değişen blokları patch operasyonu olarak döndür. Patch'teki her eleman şu alanlara sahip TEK bir obje (iç içe obje YOK, hepsi aynı seviyede):
   - Yeni blok: {op: "add", day_of_week, start_time, end_time, title, is_hard_constraint, energy_cost, flexibility_score} — bu 7 alanın HEPSİ dolu olmalı.
   - Var olan bloğu güncelle: {op: "update", block_id: "..."} + SADECE değişen alan(lar) (örn. sadece start_time ve end_time).
   - Blok sil: {op: "delete", block_id: "..."}
   İLGİSİZ BLOKLARA DOKUNMA — tüm tabloyu yeniden üretme, sadece istenen değişikliği yap.`

function buildBlockContext(blocks: z.infer<typeof draftBlockSchema>[]): string {
  if (blocks.length === 0) return '(taslak boş)'
  return blocks
    .map(
      (b) =>
        `- [${b.client_id}] ${DAY_NAMES[b.day_of_week] ?? '?'} ${b.start_time.slice(0, 5)}-${b.end_time.slice(0, 5)} "${b.title}" (sabit:${b.is_hard_constraint}, enerji:${b.energy_cost}, esneklik:${b.flexibility_score})`
    )
    .join('\n')
}

/** Modelin döndürdüğü düz patch operasyonlarını, halüsinasyon süzgecinden geçirip temiz/iç içe şekle çevirir. */
function cleanPatch(
  rawPatch: z.infer<typeof patchOperationSchema>[],
  blockMap: Map<string, z.infer<typeof draftBlockSchema>>
): CleanPatchOperation[] {
  const ops: CleanPatchOperation[] = []

  for (const raw of rawPatch) {
    if (raw.op === 'add') {
      if (
        raw.day_of_week == null ||
        !raw.start_time ||
        !raw.end_time ||
        !raw.title ||
        raw.is_hard_constraint == null ||
        raw.energy_cost == null ||
        raw.flexibility_score == null
      ) {
        continue // eksik alanlı add operasyonu güvenilir değil, atla
      }
      ops.push({
        op: 'add',
        block: {
          day_of_week: clampInt(raw.day_of_week, 0, 6),
          start_time: raw.start_time,
          end_time: raw.end_time,
          title: raw.title,
          is_hard_constraint: raw.is_hard_constraint,
          energy_cost: clampInt(raw.energy_cost, 1, 5),
          flexibility_score: raw.is_hard_constraint ? 1 : clampInt(raw.flexibility_score, 1, 5),
        },
      })
    } else if (raw.op === 'update') {
      if (!raw.block_id || !blockMap.has(raw.block_id)) continue // gerçekte var olmayan bloğa referans, atla
      const fields: Partial<BlockFields> = {}
      if (raw.day_of_week != null) fields.day_of_week = clampInt(raw.day_of_week, 0, 6)
      if (raw.start_time != null) fields.start_time = raw.start_time
      if (raw.end_time != null) fields.end_time = raw.end_time
      if (raw.title != null) fields.title = raw.title
      if (raw.is_hard_constraint != null) fields.is_hard_constraint = raw.is_hard_constraint
      if (raw.energy_cost != null) fields.energy_cost = clampInt(raw.energy_cost, 1, 5)
      if (raw.flexibility_score != null) fields.flexibility_score = clampInt(raw.flexibility_score, 1, 5)
      if (raw.is_hard_constraint === true) fields.flexibility_score = 1
      ops.push({ op: 'update', block_id: raw.block_id, fields })
    } else if (raw.op === 'delete') {
      if (!raw.block_id || !blockMap.has(raw.block_id)) continue
      ops.push({ op: 'delete', block_id: raw.block_id })
    }
  }

  return ops.slice(0, 20)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ status: 'error', message: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }

  const { data: config } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'ai_chat_enabled')
    .single()

  if (config?.value !== true) {
    return Response.json({ status: 'error', message: 'Bu özellik şu an kapalı' }, { status: 403 })
  }

  let body: z.infer<typeof requestSchema>
  try {
    body = requestSchema.parse(await request.json())
  } catch {
    return Response.json({ status: 'error', message: 'Geçersiz istek gövdesi' }, { status: 400 })
  }

  // Bütçe kontrolü mesaj işlenmeden ÖNCE yapılır — bir yanıt asla ortada kesilmez.
  // Bütçe aşılmışsa BİR SONRAKİ mesaj için kilit devreye girer.
  const { data: usageRows } = await supabase
    .from('ai_chat_usage')
    .select('total_tokens')
    .eq('session_id', body.sessionId)
    .eq('user_id', user.id)
  const priorSessionTotal = (usageRows ?? []).reduce((sum, r) => sum + r.total_tokens, 0)

  if (priorSessionTotal >= AI_CHAT_TOKEN_BUDGET) {
    return Response.json({ status: 'budget_exceeded', sessionTotalTokens: priorSessionTotal })
  }

  const blockMap = new Map(body.blocks.map((b) => [b.client_id, b]))
  const blockContext = buildBlockContext(body.blocks)

  // Prompt caching: sistem promptu SABİT olduğu için her zaman cache'lenebilir. Değişken
  // taslak blok listesi bu yüzden system'de DEĞİL, her turda en yeni mesajın içine gömülü
  // (aşağıda). Geçmişin en son mesajına da bir cache breakpoint konuyor — böylece bir SONRAKİ
  // turda bu prefix'in tamamı (byte-birebir aynı olduğu için) cache'ten okunması beklenir.
  // Kullanıcı deneyiminde hiçbir fark yaratmaz, sadece maliyeti düşürmesi beklenir.
  // NOT (2026-08-17): İstek gövdesi doğrulandı — cache_control her iki breakpoint'te de
  // (system + son geçmiş mesajı) doğru formatta gönderiliyor (bkz. ai-context/00-current-state.md).
  // Ama gerçek testte Anthropic'in kendi yanıtı defalarca cache_creation_input_tokens=0,
  // cache_read_input_tokens=0 döndürdü — istek doğru kurulu olmasına rağmen bu hesap/model
  // kombinasyonunda caching fiilen tetiklenmedi. Zararsız (worst case: hiç etkisi yok), bu
  // yüzden kod kalıyor — ama maliyet iyileştirmesi olarak DOĞRULANMIŞ sayılmamalı.
  const cacheControl = { anthropic: { cacheControl: { type: 'ephemeral' as const } } }

  const system = { role: 'system' as const, content: SYSTEM_PROMPT, providerOptions: cacheControl }

  const historyMessages: { role: 'user' | 'assistant'; content: string; providerOptions?: typeof cacheControl }[] =
    body.turns.map((t) => ({ role: t.role, content: t.content }))
  if (historyMessages.length > 0) {
    historyMessages[historyMessages.length - 1] = {
      ...historyMessages[historyMessages.length - 1],
      providerOptions: cacheControl,
    }
  }

  const newUserMessage = {
    role: 'user' as const,
    content: `${body.message}\n\n[Mevcut taslak bloklar]\n${blockContext}`,
  }

  let parsed: z.infer<typeof editSkeletonSchema>
  let usage: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    inputTokenDetails?: { cacheReadTokens?: number; cacheWriteTokens?: number }
  }
  try {
    const result = await generateObject({
      model: anthropic('claude-haiku-4-5-20251001'),
      schema: editSkeletonSchema,
      system,
      messages: [...historyMessages, newUserMessage],
    })
    parsed = result.object
    usage = result.usage
  } catch (err) {
    console.error('[edit-skeleton] generateObject error:', err instanceof Error ? err.message : err)
    return Response.json({ status: 'error', message: 'Mesaj işlenemedi, lütfen tekrar deneyin' }, { status: 500 })
  }

  const ambiguousBlockIds = (parsed.ambiguous_block_ids ?? []).filter((id) => blockMap.has(id))

  let needsClarification = parsed.needs_clarification
  let patch: CleanPatchOperation[] = []
  if (!parsed.is_relevant) {
    needsClarification = false
  } else if (!needsClarification) {
    patch = cleanPatch(parsed.patch, blockMap)
  }

  const turnType = !parsed.is_relevant ? 'irrelevant' : needsClarification ? 'clarification' : 'relevant'
  const thisTurnTotal = usage.totalTokens ?? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)
  const { error: usageError } = await supabase.from('ai_chat_usage').insert({
    user_id: user.id,
    session_id: body.sessionId,
    turn_type: turnType,
    input_tokens: usage.inputTokens ?? 0,
    output_tokens: usage.outputTokens ?? 0,
    total_tokens: thisTurnTotal,
    cache_read_tokens: usage.inputTokenDetails?.cacheReadTokens ?? null,
    cache_write_tokens: usage.inputTokenDetails?.cacheWriteTokens ?? null,
  })
  if (usageError) {
    console.error('[edit-skeleton] usage log error:', usageError)
  }

  return Response.json({
    status: 'ok',
    sessionTotalTokens: priorSessionTotal + thisTurnTotal,
    data: {
      is_relevant: parsed.is_relevant,
      rejection_reason: parsed.rejection_reason,
      needs_clarification: needsClarification,
      clarification_question: parsed.clarification_question,
      ambiguous_block_ids: ambiguousBlockIds,
      patch,
    },
  })
}
