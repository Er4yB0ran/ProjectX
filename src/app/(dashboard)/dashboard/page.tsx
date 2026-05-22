import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TaskCard from './TaskCard'

function getTodayIstanbul(): { dateStr: string; dbDayOfWeek: number } {
  // 'sv' locale produces YYYY-MM-DD natively — safe against UTC/Istanbul midnight drift
  const dateStr = new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Istanbul' }).format(new Date())
  const [y, m, d] = dateStr.split('-').map(Number)
  const jsDay = new Date(y, m - 1, d).getDay() // 0=Sun … 6=Sat
  const dbDayOfWeek = (jsDay + 6) % 7          // 0=Mon … 6=Sun
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

  if (error) throw new Error(`Görevler yüklenemedi: ${error.message}`)

  // skeleton_blocks'tan is_hard_constraint bilgisini çek (Task tipinde yer almıyor)
  const skeletonBlockIds = (tasks ?? [])
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

  const pending = tasks?.filter((t) => t.status === 'pending') ?? []
  const completed = tasks?.filter((t) => t.status === 'completed') ?? []
  const displayDate = formatDisplayDate(dateStr)

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 capitalize">{displayDate}</h2>
        <p className="text-sm text-gray-400 mt-0.5">{dateStr}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white/55 backdrop-blur-sm border border-white/40 rounded-2xl px-4 py-3">
          <p className="text-2xl font-semibold text-gray-800">{pending.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Bekleyen görev</p>
        </div>
        <div className="bg-white/55 backdrop-blur-sm border border-white/40 rounded-2xl px-4 py-3">
          <p className="text-2xl font-semibold text-green-600">{completed.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Tamamlanan</p>
        </div>
      </div>

      {/* Task list */}
      {tasks && tasks.length > 0 ? (
        <ul className="space-y-2.5">
          {tasks.map((task) => (
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
        <div className="bg-white/40 backdrop-blur-sm border border-dashed border-gray-300/50 rounded-2xl p-8 text-center">
          <p className="text-gray-400 text-sm">
            Bu gün için şablon tanımlı değil.
          </p>
          <p className="text-gray-300 text-xs mt-1">
            Haftalık şablonunu oluşturmak için Haftalık Şablon sayfasını ziyaret et.
          </p>
        </div>
      )}
    </div>
  )
}
