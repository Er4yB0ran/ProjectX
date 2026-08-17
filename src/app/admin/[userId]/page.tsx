import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { analyzeBehavior, buildProductivityHeatmap } from '@/lib/analytics'

function pct(rate: number | null): string {
  return rate == null ? '—' : `%${Math.round(rate * 100)}`
}

function shortBucket(label: string): string {
  return label.split(' ')[0]
}

// Tek renk (yesil), orana gore koyulasan sekansiyel dolgu — veri yoksa dolgu yok.
function heatmapFill(rate: number | null): string {
  if (rate == null) return 'transparent'
  const alpha = 0.12 + rate * 0.68
  return `rgba(34,197,94,${alpha.toFixed(2)})`
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const supabase = await createClient()

  const { data: users, error: usersError } = await supabase.rpc('admin_list_users')
  if (usersError) throw new Error(`Kullanıcı bilgisi yüklenemedi: ${usersError.message}`)
  const targetUser = users?.find((u) => u.id === userId)

  const { data: tasks, error: tasksError } = await supabase.rpc('admin_get_user_tasks', {
    p_user_id: userId,
  })
  if (tasksError) throw new Error(`Görevler yüklenemedi: ${tasksError.message}`)

  const analysis = analyzeBehavior(tasks ?? [])
  const heatmap = buildProductivityHeatmap(tasks ?? [])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/admin" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
          ← Kullanıcılara dön
        </Link>
        <h1 className="text-xl font-semibold text-white mt-1">
          {targetUser?.full_name || targetUser?.email || 'Kullanıcı'}
        </h1>
        {targetUser?.email && (
          <p className="text-xs text-neutral-500 mt-0.5">{targetUser.email}</p>
        )}
      </div>

      {analysis.totalResolved === 0 ? (
        <div className="bg-neutral-900 border border-dashed border-neutral-700 rounded-xl p-8 text-center">
          <p className="text-neutral-400 text-sm">Bu kullanıcı için henüz analiz edilecek veri yok.</p>
          <p className="text-neutral-600 text-xs mt-1.5">
            Kullanıcı görevleri Yaptım / Erteledim / Olmadı ile işaretledikçe burada örüntüler görünecek.
          </p>
        </div>
      ) : (
        <>
          {/* Genel oran */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-4 mb-6">
            <p className="text-3xl font-semibold text-white tabular-nums">{pct(analysis.overallRate)}</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Genel tamamlama oranı ({analysis.totalResolved} sonuçlanmış görev)
            </p>
          </div>

          {/* Verimli alan */}
          <div className="mb-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-2">Verimli alan (gün × saat dilimi)</h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 overflow-x-auto">
              <div className="grid grid-cols-[3rem_repeat(7,minmax(2.75rem,1fr))] gap-0.5 min-w-[420px]">
                <div />
                {heatmap[0].map((cell) => (
                  <div key={cell.dayLabel} className="text-center text-[10px] text-neutral-500 pb-1">
                    {cell.dayLabel}
                  </div>
                ))}
                {heatmap.map((row) => (
                  <div key={row[0].bucketLabel} className="contents">
                    <div className="text-[10px] text-neutral-500 flex items-center pr-1 truncate">
                      {shortBucket(row[0].bucketLabel)}
                    </div>
                    {row.map((cell) => (
                      <div
                        key={cell.dayLabel}
                        title={`${cell.dayLabel} · ${cell.bucketLabel}: ${
                          cell.total === 0 ? 'görev yok' : `${cell.completed}/${cell.total} tamamlandı`
                        }`}
                        style={{ backgroundColor: heatmapFill(cell.rate) }}
                        className={`aspect-square rounded flex items-center justify-center text-[10px] tabular-nums ${
                          cell.total === 0
                            ? 'border border-dashed border-neutral-800 text-neutral-700'
                            : 'text-white/90'
                        }`}
                      >
                        {cell.total === 0 ? '' : `${Math.round((cell.rate ?? 0) * 100)}`}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-neutral-600 mt-1.5">Koyu yeşil = yüksek tamamlama oranı. Boş hücre = o dilimde hiç görev olmamış.</p>
          </div>

          {/* Saat dilimine göre */}
          <div className="mb-6">
            <h2 className="text-sm font-medium text-neutral-300 mb-2">Saat dilimine göre başarı</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {analysis.buckets.map((b) => (
                <div key={b.label} className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-3">
                  <p className="text-xl font-semibold text-white tabular-nums">{pct(b.rate)}</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{b.label}</p>
                  <p className="text-[10px] text-neutral-600 mt-0.5">{b.total} görev</p>
                </div>
              ))}
            </div>
          </div>

          {/* En çok aksayan görevler */}
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-2">En çok aksayan görevler</h2>
            {analysis.worstTitles.length === 0 ? (
              <p className="text-sm text-neutral-600">Belirgin bir örüntü yok — iyi gidiyor.</p>
            ) : (
              <div className="space-y-1.5">
                {analysis.worstTitles.map((t) => (
                  <div
                    key={t.title}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{t.title}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {t.completed} tamamlandı · {t.rescheduled} ertelendi · {t.cancelled} iptal ({t.total} toplam)
                      </p>
                    </div>
                    <span className="text-sm font-medium text-amber-400 tabular-nums shrink-0">{pct(t.rate)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
