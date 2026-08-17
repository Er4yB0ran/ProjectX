interface AiChatUsageSummary {
  total_turns: number
  total_input_tokens: number
  total_output_tokens: number
  total_tokens: number
  total_cache_read_tokens: number
  distinct_users: number
  distinct_sessions: number
}

interface AiChatUsageSummaryCardProps {
  summary: AiChatUsageSummary | null
}

export default function AiChatUsageSummaryCard({ summary }: AiChatUsageSummaryCardProps) {
  const stats = [
    { label: 'Toplam mesaj', value: summary?.total_turns ?? 0 },
    { label: 'Toplam token', value: summary?.total_tokens ?? 0 },
    { label: 'Farklı kullanıcı', value: summary?.distinct_users ?? 0 },
    { label: 'Farklı oturum', value: summary?.distinct_sessions ?? 0 },
  ]

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-6">
      <p className="text-sm font-medium text-white mb-3">Onboarding AI Sohbet Kullanımı</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-center">
            <p className="text-lg font-semibold text-white tabular-nums">{value.toLocaleString('tr-TR')}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
