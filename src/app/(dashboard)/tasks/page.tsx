import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { TaskStatus } from '@/types/supabase'
import TasksView from './TasksView'

const VALID_STATUSES: TaskStatus[] = ['pending', 'completed', 'rescheduled', 'cancelled']

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { status: rawStatus } = await searchParams
  const activeStatus =
    rawStatus && VALID_STATUSES.includes(rawStatus as TaskStatus) ? rawStatus : 'all'

  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('original_date', { ascending: false })
    .order('start_time', { ascending: true, nullsFirst: false })

  if (activeStatus !== 'all') {
    query = query.eq('status', activeStatus as TaskStatus)
  }

  const { data: tasks } = await query

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-6">Görevler</h1>
      <TasksView tasks={tasks ?? []} activeStatus={activeStatus} />
    </div>
  )
}
