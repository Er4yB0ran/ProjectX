'use client'

import { AI_CHAT_TOKEN_BUDGET, AI_CHAT_WARNING_THRESHOLD, AI_CHAT_STRONG_WARNING_THRESHOLD } from '@/lib/aiChatConfig'

interface BudgetBannerProps {
  sessionTotalTokens: number
}

export default function BudgetBanner({ sessionTotalTokens }: BudgetBannerProps) {
  const ratio = sessionTotalTokens / AI_CHAT_TOKEN_BUDGET

  if (ratio >= 1) {
    return (
      <div className="mx-4 mb-3 px-3.5 py-2.5 rounded-xl text-xs bg-violet-600/10 border border-violet-500/25 text-violet-200/85">
        İskeletin oldukça netleşti. Şimdilik bu haliyle devam edebilirsin — ince ayarları istediğin zaman tekrar yapabileceksin.
      </div>
    )
  }

  if (ratio >= AI_CHAT_STRONG_WARNING_THRESHOLD) {
    return (
      <div className="mx-4 mb-3 px-3.5 py-2.5 rounded-xl text-xs bg-amber-500/10 border border-amber-500/25 text-amber-200/85">
        Sohbet bütçenin büyük kısmını kullandın, önemli değişiklikleri şimdi yapman iyi olur.
      </div>
    )
  }

  if (ratio >= AI_CHAT_WARNING_THRESHOLD) {
    return (
      <div className="mx-4 mb-3 px-3.5 py-2.5 rounded-xl text-xs bg-white/[0.04] border border-white/[0.10] text-white/50">
        Bu oturumda kullanabileceğin düzenleme hakkının bir kısmı kaldı.
      </div>
    )
  }

  return null
}
