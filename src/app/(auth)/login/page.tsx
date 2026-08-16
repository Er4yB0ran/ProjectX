'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS === 'true'
const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_EMAIL ?? ''
const DEV_PASSWORD = process.env.NEXT_PUBLIC_DEV_PASSWORD ?? ''

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function signIn(e: string, p: string) {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: e, password: p })
    if (error) {
      setError(error.message || 'Giriş başarısız. Supabase erişilemiyor olabilir.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    await signIn(email, password)
  }

  async function handleDevBypass() {
    if (!DEV_EMAIL || !DEV_PASSWORD) {
      setError('DEV_EMAIL ve DEV_PASSWORD değerlerini .env.local dosyasına ekle.')
      return
    }
    await signIn(DEV_EMAIL, DEV_PASSWORD)
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <h1 className="text-2xl font-bold mb-2">Giriş yap</h1>
      <p className="text-gray-500 text-sm mb-6">ProjectX hesabına giriş yap</p>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="sen@ornek.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
        </button>
      </form>

      {DEV_BYPASS && (
        <div className="mt-4 pt-4 border-t border-dashed border-amber-300">
          <button
            type="button"
            onClick={handleDevBypass}
            disabled={loading}
            className="w-full bg-amber-400 text-amber-900 py-2 px-4 rounded-lg text-sm font-semibold hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            🛠 DEV: Bypass Girişi
          </button>
          <p className="text-center text-[11px] text-amber-600 mt-1">Yalnızca geliştirme ortamında görünür</p>
        </div>
      )}

      <p className="mt-4 text-center text-sm text-gray-600">
        Hesabın yok mu?{' '}
        <Link href="/signup" className="text-blue-600 hover:underline font-medium">
          Kayıt ol
        </Link>
      </p>
    </div>
  )
}
