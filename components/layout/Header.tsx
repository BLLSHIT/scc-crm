import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/utils/format'
import type { Profile } from '@/types/app.types'

interface HeaderProps {
  title: string
  actions?: React.ReactNode
  profile: Profile
}

export function Header({ title, actions, profile }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <div className="flex items-center gap-3">
        {actions}
        <Button variant="ghost" size="icon" className="text-slate-500">
          <Bell className="w-4 h-4" />
        </Button>
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
          {getInitials(profile.firstName, profile.lastName)}
        </div>
      </div>
    </header>
  )
}
