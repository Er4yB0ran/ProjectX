'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Bugün' },
  { href: '/template', label: 'Haftalık Şablon' },
  { href: '/tasks', label: 'Görevler' },
  { href: '/analiz', label: 'Analiz' },
]

export default function SidebarNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()

  const links = isAdmin ? [...NAV_LINKS, { href: '/admin', label: 'Admin' }] : NAV_LINKS

  return (
    <ul className="space-y-0.5 flex-1">
      {links.map(({ href, label }) => {
        const isActive = pathname === href
        return (
          <li key={href}>
            <Link
              href={href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              {label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
