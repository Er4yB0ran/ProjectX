import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarNav from '@/components/SidebarNav'

export default async function DashboardLayout({
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
    .select('onboarding_completed, is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_completed) redirect('/onboarding')

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <nav className="w-64 bg-neutral-900 border-r border-neutral-800 p-4 flex flex-col">
        <div className="mb-8">
          <h1 className="text-lg font-bold text-white tracking-tight">ProjectX</h1>
          <p className="text-xs text-neutral-500 truncate mt-0.5">{user.email}</p>
        </div>

        <SidebarNav isAdmin={profile.is_admin} />

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-800 hover:text-neutral-300 transition-colors"
          >
            Çıkış yap
          </button>
        </form>
      </nav>

      <main className="flex-1 p-6 overflow-auto bg-neutral-950">{children}</main>
    </div>
  )
}
