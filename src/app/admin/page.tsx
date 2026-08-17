import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AiChatConfigCard from './AiChatConfigCard'
import AiChatUsageSummaryCard from './AiChatUsageSummaryCard'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const [{ data: users, error }, { data: config }, { data: usageSummary, error: usageError }] = await Promise.all([
    supabase.rpc('admin_list_users'),
    supabase.from('app_config').select('value').eq('key', 'ai_chat_enabled').single(),
    supabase.rpc('admin_ai_chat_usage_summary').single(),
  ])

  if (error) throw new Error(`Kullanıcılar yüklenemedi: ${error.message}`)
  if (usageError) throw new Error(`Kullanım özeti yüklenemedi: ${usageError.message}`)

  return (
    <div className="max-w-5xl mx-auto">
      <AiChatConfigCard initialEnabled={config?.value === true} />
      <AiChatUsageSummaryCard summary={usageSummary ?? null} />

      <h2 className="text-xl font-semibold text-white mb-6">Kullanıcılar</h2>

      {users && users.length > 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500">
                <th className="px-4 py-3 font-medium">E-posta</th>
                <th className="px-4 py-3 font-medium">Ad</th>
                <th className="px-4 py-3 font-medium">Onboarding</th>
                <th className="px-4 py-3 font-medium">Kayıt tarihi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-neutral-800 last:border-0">
                  <td className="px-0 py-0">
                    <Link
                      href={`/admin/${u.id}`}
                      className="block px-4 py-3 text-white hover:bg-neutral-800 transition-colors"
                    >
                      {u.email ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{u.full_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        u.onboarding_completed
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-neutral-800 text-neutral-500'
                      }`}
                    >
                      {u.onboarding_completed ? 'tamamlandı' : 'bekliyor'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-neutral-900 border border-dashed border-neutral-700 rounded-xl p-8 text-center">
          <p className="text-neutral-400 text-sm">Henüz kullanıcı yok.</p>
        </div>
      )}
    </div>
  )
}
