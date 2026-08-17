import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingForm from './OnboardingForm'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_completed) redirect('/dashboard')

  const { data: config } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'ai_chat_enabled')
    .single()

  const aiChatEnabled = config?.value === true

  return <OnboardingForm aiChatEnabled={aiChatEnabled} />
}
