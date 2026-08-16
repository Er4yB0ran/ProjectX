import type { Task } from '@/types/supabase'

export interface TimeBucketStat {
  label: string
  total: number
  completed: number
  rate: number | null
}

export interface TitleStat {
  title: string
  total: number
  completed: number
  rescheduled: number
  cancelled: number
  rate: number | null
}

export interface BehaviorAnalysis {
  totalResolved: number
  overallRate: number | null
  buckets: TimeBucketStat[]
  worstTitles: TitleStat[]
}

const RESOLVED_STATUSES = new Set(['completed', 'cancelled', 'rescheduled'])

const BUCKETS = [
  { label: 'Sabah (06-12)', startHour: 6, endHour: 12 },
  { label: 'Öğlen (12-18)', startHour: 12, endHour: 18 },
  { label: 'Akşam (18-24)', startHour: 18, endHour: 24 },
  { label: 'Gece (00-06)', startHour: 0, endHour: 6 },
] as const

function bucketLabelForHour(hour: number): string {
  return (BUCKETS.find((b) => hour >= b.startHour && hour < b.endHour) ?? BUCKETS[0]).label
}

// Uygulama genelinde kullanılan gun-index kurali: Pazartesi=0 ... Pazar=6 (bkz. dashboard/page.tsx)
const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

function appDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const jsDay = new Date(y, m - 1, d).getDay()
  return (jsDay + 6) % 7
}

export interface HeatmapCell {
  dayLabel: string
  bucketLabel: string
  total: number
  completed: number
  rate: number | null
}

type HeatmapTask = Pick<Task, 'status' | 'start_time' | 'task_date'>

/**
 * Saat dilimi x gun kirilimda tamamlama orani — "verimli alan" gorseli icin.
 * Disardaki dizi saat dilimi (satir), icerideki dizi gun (sutun) sirasinda.
 * Sadece start_time'i olan (saati belli) gorevler dahil edilir.
 */
export function buildProductivityHeatmap(tasks: HeatmapTask[]): HeatmapCell[][] {
  const resolved = tasks.filter((t) => RESOLVED_STATUSES.has(t.status) && t.start_time)

  const grid = BUCKETS.map(() => DAY_LABELS.map(() => ({ total: 0, completed: 0 })))

  for (const t of resolved) {
    const dayIndex = appDayOfWeek(t.task_date)
    const bucketIndex = BUCKETS.findIndex((b) => b.label === bucketLabelForHour(Number(t.start_time!.slice(0, 2))))
    const cell = grid[bucketIndex][dayIndex]
    cell.total += 1
    if (t.status === 'completed') cell.completed += 1
  }

  return grid.map((row, bucketIndex) =>
    row.map((cell, dayIndex) => ({
      dayLabel: DAY_LABELS[dayIndex],
      bucketLabel: BUCKETS[bucketIndex].label,
      total: cell.total,
      completed: cell.completed,
      rate: cell.total > 0 ? cell.completed / cell.total : null,
    }))
  )
}

type AnalyzableTask = Pick<Task, 'title' | 'status' | 'start_time'>

export function analyzeBehavior(tasks: AnalyzableTask[]): BehaviorAnalysis {
  const resolved = tasks.filter((t) => RESOLVED_STATUSES.has(t.status))
  const completedCount = resolved.filter((t) => t.status === 'completed').length
  const overallRate = resolved.length > 0 ? completedCount / resolved.length : null

  const bucketMap = new Map<string, { total: number; completed: number }>(
    BUCKETS.map((b) => [b.label, { total: 0, completed: 0 }])
  )
  for (const t of resolved) {
    if (!t.start_time) continue
    const entry = bucketMap.get(bucketLabelForHour(Number(t.start_time.slice(0, 2))))!
    entry.total += 1
    if (t.status === 'completed') entry.completed += 1
  }
  const buckets: TimeBucketStat[] = BUCKETS.map((b) => {
    const entry = bucketMap.get(b.label)!
    return {
      label: b.label,
      total: entry.total,
      completed: entry.completed,
      rate: entry.total > 0 ? entry.completed / entry.total : null,
    }
  })

  const titleMap = new Map<string, Omit<TitleStat, 'rate'>>()
  for (const t of resolved) {
    const existing = titleMap.get(t.title) ?? {
      title: t.title,
      total: 0,
      completed: 0,
      rescheduled: 0,
      cancelled: 0,
    }
    existing.total += 1
    if (t.status === 'completed') existing.completed += 1
    if (t.status === 'rescheduled') existing.rescheduled += 1
    if (t.status === 'cancelled') existing.cancelled += 1
    titleMap.set(t.title, existing)
  }

  // En az 2 kez tekrar etmiş ve en az bir kez aksamış başlıklar arasından en düşük orana sahip ilk 5
  // (tek seferlik bir görev, tesadüfen iptal edilince listeye anlamsız şekilde hakim olmasın diye)
  const worstTitles: TitleStat[] = Array.from(titleMap.values())
    .map((s) => ({ ...s, rate: s.total > 0 ? s.completed / s.total : null }))
    .filter((s) => s.total >= 2 && (s.rescheduled > 0 || s.cancelled > 0))
    .sort((a, b) => (a.rate ?? 1) - (b.rate ?? 1))
    .slice(0, 5)

  return { totalResolved: resolved.length, overallRate, buckets, worstTitles }
}
