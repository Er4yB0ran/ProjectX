import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="border-b border-neutral-800 bg-neutral-900 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              ← Panele dön
            </Link>
            <h1 className="text-lg font-bold text-white tracking-tight mt-1">Admin</h1>
          </div>
          <p className="text-xs text-neutral-500 truncate">{user.email}</p>
        </div>
      </header>

      <main className="p-6">{children}</main>
    </div>
  )
}
