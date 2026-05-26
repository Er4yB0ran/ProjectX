import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TaskCard from './TaskCard'
import CloseDay from './CloseDay'

function getTodayIstanbul(): { dateStr: string; dbDayOfWeek: number } {
  const dateStr = new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Istanbul' }).format(new Date())
  const [y, m, d] = dateStr.split('-').map(Number)
  const jsDay = new Date(y, m - 1, d).getDay()
  const dbDayOfWeek = (jsDay + 6) % 7
  return { dateStr, dbDayOfWeek }
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(y, m - 1, d))
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) redirect('/login')

  const { dateStr, dbDayOfWeek } = getTodayIstanbul()

  const { data: tasks, error } = await supabase.rpc('get_or_create_daily_tasks', {
    p_user_id: user.id,
    p_date: dateStr,
    p_day_of_week: dbDayOfWeek,
  })

  if (error) throw new Error(`Gorevler yuklenemedi: ${error.message}`)

  // Bugun olusturulup ertelenen gorevleri de cek (task_date yarina guncellendi, original_date bugun)
  const { data: rescheduledFromToday } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('original_date', dateStr)
    .eq('status', 'rescheduled')
    .neq('task_date', dateStr)
    .order('start_time', { ascending: true, nullsFirst: false })

  // Gorev listesini birlestir; RPC'den gelenler once, ertelenenler sona eklenir
  const todayIds = new Set((tasks ?? []).map((t) => t.id))
  const allTasks = [
    ...(tasks ?? []),
    ...(rescheduledFromToday ?? []).filter((t) => !todayIds.has(t.id)),
  ]

  const { data: todayReflection } = await supabase
    .from('daily_reflections')
    .select('ai_message')
    .eq('user_id', user.id)
    .eq('reflection_date', dateStr)
    .maybeSingle()

  const skeletonBlockIds = allTasks
    .map((t) => t.skeleton_block_id)
    .filter(Boolean) as string[]

  const { data: blocks } = skeletonBlockIds.length > 0
    ? await supabase
        .from('skeleton_blocks')
        .select('id, is_hard_constraint')
        .in('id', skeletonBlockIds)
    : { data: [] }

  const hardConstraintMap = new Map(
    (blocks ?? []).map((b) => [b.id, b.is_hard_constraint ?? false])
  )

  const pending = allTasks.filter((t) => t.status === 'pending')
  const completed = allTasks.filter((t) => t.status === 'completed')
  const displayDate = formatDisplayDate(dateStr)

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white capitalize tracking-tight">{displayDate}</h2>
        <p className="text-sm text-neutral-500 mt-0.5">{dateStr}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
          <p className="text-2xl font-semibold text-white tabular-nums">{pending.length}</p>
          <p className="text-xs text-neutral-400 mt-0.5">Bekleyen gorev</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
          <p className="text-2xl font-semibold text-green-400 tabular-nums">{completed.length}</p>
          <p className="text-xs text-neutral-400 mt-0.5">Tamamlanan</p>
        </div>
      </div>

      {/* Task list */}
      {allTasks.length > 0 ? (
        <ul className="space-y-2">
          {allTasks.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                isFixed={
                  hardConstraintMap.get(task.skeleton_block_id ?? '') === true ||
                  task.flexibility_score === 1
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="bg-neutral-900 border border-dashed border-neutral-700 rounded-xl p-8 text-center">
          <p className="text-neutral-400 text-sm">
            Bu gun icin sablon tanimli degil.
          </p>
          <p className="text-neutral-600 text-xs mt-1.5">
            Haftalik sablonunu olusturmak icin Haftalik Sablon sayfasini ziyaret et.
          </p>
        </div>
      )}

      {/* Close Day */}
      <CloseDay existingMessage={todayReflection?.ai_message ?? null} />
    </div>
  )
}
