'use client'
import { useState } from 'react'
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
  Tags,
  AlignLeft,
  UserCog,
  Briefcase,
  Megaphone,
  Database,
  Settings,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils/format'
import type { Profile } from '@/types/app.types'

interface NavItem {
  label: string
  href: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any
}

interface NavSection {
  id: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any
  label: string
  items: NavItem[]
}

const mainNav: NavItem[] = [
  { label: 'Dashboard',     href: '/',              icon: LayoutDashboard },
  { label: 'Kontakte',      href: '/contacts',      icon: Users },
  { label: 'Firmen',        href: '/companies',     icon: Building2 },
  { label: 'Deals',         href: '/deals',         icon: TrendingUp },
  { label: 'Projekte',      href: '/projects',      icon: FolderKanban },
  { label: 'Angebote',      href: '/quotes',        icon: FileText },
  { label: 'Rechnungen',    href: '/invoices',      icon: Receipt },
  { label: 'Aufgaben',      href: '/tasks',         icon: CheckSquare },
]

const sections: NavSection[] = [
  {
    id: 'stammdaten',
    icon: Database,
    label: 'Stammdaten',
    items: [
      { label: 'Produkte',     href: '/products',     icon: Package },
      { label: 'Kategorien',   href: '/categories',   icon: Tags },
      { label: 'Branchen',     href: '/industries',   icon: Briefcase },
      { label: 'Lead-Quellen', href: '/lead-sources', icon: Megaphone },
    ],
  },
  {
    id: 'einstellungen',
    icon: Settings,
    label: 'Einstellungen',
    items: [
      { label: 'Allgemein',     href: '/settings',     icon: Settings },
      { label: 'Team & Rollen', href: '/teams',        icon: UserCog },
      { label: 'Textbausteine', href: '/text-modules', icon: AlignLeft },
    ],
  },
]

interface SidebarProps {
  profile: Profile
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Default-Open: Section wenn aktuelle Route darin liegt
  const initialOpen = sections.reduce<Record<string, boolean>>((acc, s) => {
    acc[s.id] = s.items.some((it) => pathname.startsWith(it.href))
    return acc
  }, {})
  const [open, setOpen] = useState<Record<string, boolean>>(initialOpen)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isItemActive(href: string) {
    return pathname === href || (href !== '/' && pathname.startsWith(href))
  }

  function toggleSection(id: string) {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-slate-100 flex-shrink-0 print:hidden">
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
        {mainNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isItemActive(item.href)
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            )}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {item.label}
          </Link>
        ))}

        {/* Collapsible Sections */}
        {sections.map((sec) => {
          const isOpen = open[sec.id]
          const hasActiveChild = sec.items.some((it) => isItemActive(it.href))
          return (
            <div key={sec.id} className="pt-3 mt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => toggleSection(sec.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs uppercase tracking-wider transition-colors',
                  hasActiveChild ? 'text-slate-200' : 'text-slate-500 hover:text-slate-300'
                )}
              >
                <sec.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1 text-left">{sec.label}</span>
                {isOpen
                  ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                  : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />}
              </button>
              {isOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {sec.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 pl-9 pr-3 py-2 rounded-lg text-sm transition-colors',
                        isItemActive(item.href)
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      )}
                    >
                      <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-0.5">
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
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-300 truncate">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="text-xs text-slate-500 truncate flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {profile.role ?? 'sales'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
