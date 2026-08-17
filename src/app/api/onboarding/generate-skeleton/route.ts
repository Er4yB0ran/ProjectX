import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

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

const skeletonSchema = z.object({
  blocks: z.array(
    z.object({
      day_of_week: z.number(),
      start_time: z.string(),
      end_time: z.string(),
      title: z.string(),
      is_hard_constraint: z.boolean(),
      energy_cost: z.number(),
      flexibility_score: z.number(),
    })
  ),
})

/** Anthropic'in structured output şeması 'number' tipinde min/max desteklemiyor — modelden sonra sunucu tarafında sıkıştırıyoruz. */
function clampScore(n: number): number {
  return Math.min(5, Math.max(1, Math.round(n)))
}

const SYSTEM_PROMPT = `Sen bir sistem kurucususun. Kullanıcının verdiği esnek verilere göre, haftanın 7 günü için referans bir iskelet oluştur. Hayatı tamamen doldurma, sadece sabit görevleri (is_hard_constraint: true) ve kullanıcının enerjisine uygun birkaç odak bloğunu (is_hard_constraint: false) yerleştir.

Kurallar:
- day_of_week: 0=Pazartesi, 1=Salı, 2=Çarşamba, 3=Perşembe, 4=Cuma, 5=Cumartesi, 6=Pazar
- start_time / end_time: "HH:MM:SS" formatında (örnek: "09:00:00")
- Uyku saatlerini BLOK OLARAK EKLEME
- Serbest günlerde yalnızca is_hard_constraint: false bloklar ekle veya hiç ekleme
- Toplam blok sayısı 30'u geçmesin
- Oluşturduğun her blok için, görevin niteliğine (title) göre mantıksal bir çıkarım yap ve şu iki değeri kendin belirle: 'energy_cost' (1: çok hafif/dinlenme, 5: aşırı zihinsel/fiziksel yorgunluk gerektiren) ve 'flexibility_score' (1: kesinlikle yeri ve süresi esnetilemez, 5: günün herhangi bir anına veya yarına kolayca atılabilir). Sabit görevlerin (is_hard_constraint: true) flexibility_score değeri her zaman 1 olmalıdır.`

const ENERGY_TIMES: Record<string, string> = {
  Sabah: '07:00-10:00',
  Öğle: '11:00-13:00',
  İkindi: '14:00-17:00',
  Akşam: '18:00-21:00',
  Gece: '21:00-23:00',
}

const DAY_NAMES: Record<number, string> = {
  0: 'Pazartesi',
  1: 'Salı',
  2: 'Çarşamba',
  3: 'Perşembe',
  4: 'Cuma',
  5: 'Cumartesi',
  6: 'Pazar',
}

function buildUserPrompt(form: OnboardingFormState): string {
  const energyLines = form.energyPeaks
    .map((p) => `  - ${p}: ${ENERGY_TIMES[p] ?? ''}`)
    .join('\n')

  const blocksLines =
    form.fixedBlocks.length > 0
      ? form.fixedBlocks.map((b) => `  - ${b.title}: ${b.startTime} - ${b.endTime}`).join('\n')
      : '  (yok)'

  const freeDayNames =
    form.freeDays.length > 0
      ? form.freeDays.map((d) => DAY_NAMES[d]).join(', ')
      : '(yok)'

  return `Hafta içi uyanma: ${form.weekdayWakeUp}, uyuma: ${form.weekdaySleep}
Hafta sonu uyanma: ${form.weekendWakeUp}, uyuma: ${form.weekendSleep}

Sabit bloklar (hafta içi her gün için is_hard_constraint: true olarak ekle):
${blocksLines}

Enerji pikleri (bu saatlerde is_hard_constraint: false odak blokları koy):
${energyLines || '  (belirtilmedi)'}

Serbest günler (bu günlerde blok azalt veya ekleme):
${freeDayNames}

Hafta sonu rutini: ${form.weekendRoutine || '(belirtilmedi)'}
Planlama tarzı: ${form.planningStyle || '(belirtilmedi)'}`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }

  let form: OnboardingFormState
  try {
    form = await request.json()
  } catch {
    return Response.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 })
  }

  const userPrompt = buildUserPrompt(form)

  try {
    const { object } = await generateObject({
      model: anthropic('claude-haiku-4-5-20251001'),
      schema: skeletonSchema,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    })
    const blocks = object.blocks.map((b) => ({
      ...b,
      energy_cost: clampScore(b.energy_cost),
      flexibility_score: clampScore(b.flexibility_score),
    }))
    return Response.json({ blocks })
  } catch (err) {
    console.error('[onboarding] generateObject error:', err instanceof Error ? err.message : err)
    return Response.json({ error: 'Şablon oluşturulamadı, lütfen tekrar deneyin' }, { status: 500 })
  }
}
