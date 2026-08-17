'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleAiChatEnabled(enabled: boolean): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('admin_set_config', {
    p_key: 'ai_chat_enabled',
    p_value: enabled,
  })

  if (error) throw new Error(`Ayar güncellenemedi: ${error.message}`)

  revalidatePath('/admin')
}
