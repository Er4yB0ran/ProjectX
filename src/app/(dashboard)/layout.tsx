import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

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
    .select('onboarding_completed')
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

        <ul className="space-y-0.5 flex-1">
          <li>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              Bugun
            </Link>
          </li>
          <li>
            <Link
              href="/template"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              Haftalik Sablon
            </Link>
          </li>
          <li>
            <Link
              href="/tasks"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              Gorevler
            </Link>
          </li>
        </ul>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-800 hover:text-neutral-300 transition-colors"
          >
            Cikis yap
          </button>
        </form>
      </nav>

      <main className="flex-1 p-6 overflow-auto bg-neutral-950">{children}</main>
    </div>
  )
}
