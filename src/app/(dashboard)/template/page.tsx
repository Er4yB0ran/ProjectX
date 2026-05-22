import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TemplateManager from './TemplateManager'

export const metadata = {
  title: 'Haftalık Şablon — ProjectX',
}

export default async function TemplatePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) redirect('/login')

  // Kullanıcının tüm skeleton_blocks'larını çek, saat sıralamasıyla
  const { data: blocks, error } = await supabase
    .from('skeleton_blocks')
    .select('*')
    .eq('user_id', user.id)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    throw new Error(`Şablon yüklenemedi: ${error.message}`)
  }

  return <TemplateManager blocks={blocks ?? []} />
}
