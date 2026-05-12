export type UserRole = 'admin' | 'sales' | 'project_manager' | 'viewer'

export interface Profile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  avatarUrl?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: UserRole[]
}
