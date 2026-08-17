import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const commitSchema = z.object({
  blocks: z.array(
    z.object({
      day_of_week: z.number(),
      start_time: z.string(),
      end_time: z.string(),
      title: z.string(),
      is_hard_constraint: z.boolean(),
      energy_cost: z.number().min(1).max(5),
      flexibility_score: z.number().min(1).max(5),
    })
  ),
  weekdayWakeUp: z.string(),
  weekdaySleep: z.string(),
  energyPeaks: z.array(z.string()),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }

  let body: z.infer<typeof commitSchema>
  try {
    body = commitSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 })
  }

  const { error: rpcError } = await supabase.rpc('complete_onboarding', {
    p_user_id: user.id,
    p_blocks: body.blocks,
    p_wake_up: body.weekdayWakeUp + ':00',
    p_bed_time: body.weekdaySleep + ':00',
    p_peaks: body.energyPeaks,
  })

  if (rpcError) {
    console.error('[onboarding] rpc error:', rpcError)
    return Response.json({ error: 'Veriler kaydedilemedi, lütfen tekrar deneyin' }, { status: 500 })
  }

  revalidatePath('/', 'layout')
  return Response.json({ ok: true })
}
