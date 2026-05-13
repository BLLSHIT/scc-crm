'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Building2,
  TrendingUp,
  FolderKanban,
  FileText,
  Receipt,
  CheckSquare,
  Package,
  AlignLeft,
  UserCog,
  Settings,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils/format'
import type { Profile } from '@/types/app.types'

const navItems = [
  { label: 'Dashboard',     href: '/',              icon: LayoutDashboard },
  { label: 'Kontakte',      href: '/contacts',      icon: Users },
  { label: 'Firmen',        href: '/companies',     icon: Building2 },
  { label: 'Deals',         href: '/deals',         icon: TrendingUp },
  { label: 'Projekte',      href: '/projects',      icon: FolderKanban },
  { label: 'Angebote',      href: '/quotes',        icon: FileText },
  { label: 'Rechnungen',    href: '/invoices',      icon: Receipt },
  { label: 'Aufgaben',      href: '/tasks',         icon: CheckSquare },
  { label: 'Produkte',      href: '/products',      icon: Package },
  { label: 'Textbausteine', href: '/text-modules',  icon: AlignLeft },
  { label: 'Team',          href: '/teams',         icon: UserCog },
]

interface SidebarProps {
  profile: Profile
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-slate-100 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">SC</span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">SCC Courts</p>
          <p className="text-xs text-slate-400">CRM</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-0.5">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Einstellungen
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Abmelden
        </button>
        <div className="flex items-center gap-3 px-3 pt-3">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {getInitials(profile.firstName, profile.lastName)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-300 truncate">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="text-xs text-slate-500 truncate">{profile.email}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
