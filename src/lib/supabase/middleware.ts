import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: async (url, options) => {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 3000)
          try {
            return await fetch(url, { ...options, signal: controller.signal })
          } catch {
            // Return a 503 instead of throwing — prevents Supabase from entering its retry loop
            return new Response(
              JSON.stringify({ error: 'service_unavailable', message: 'Supabase unreachable' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            )
          } finally {
            clearTimeout(timeout)
          }
        },
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() validates JWT against Supabase — do not add logic before this call.
  // try/catch: Supabase erişilemez durumdaysa (proje duraklatıldı, ağ hatası vb.)
  // middleware çökmeden devam eder; sayfa seviyesindeki auth guard'lar devreye girer.
  let user: { id: string } | null = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Supabase unreachable — pass through; page-level guards will handle auth
  }

  const pathname = request.nextUrl.pathname

  /** Korumalı rotalar — kullanıcı oturum açmamışsa /login'e yönlenir */
  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/template') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/admin')

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
