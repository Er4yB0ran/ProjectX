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
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="w-64 bg-white/70 backdrop-blur-sm border-r border-white/50 p-4 flex flex-col">
        <div className="mb-8">
          <h1 className="text-lg font-bold text-gray-900">ProjectX</h1>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
        </div>

        <ul className="space-y-1 flex-1">
          <li>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Bugün
            </Link>
          </li>
          <li>
            <Link
              href="/template"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Haftalık Şablon
            </Link>
          </li>
          <li>
            <Link
              href="/tasks"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Görevler
            </Link>
          </li>
        </ul>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Çıkış yap
          </button>
        </form>
      </nav>

      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}
