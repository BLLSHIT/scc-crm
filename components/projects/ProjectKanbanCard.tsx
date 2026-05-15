'use client'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Building2, MapPin, CalendarClock } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

export interface ProjectCardData {
  id: string
  name: string
  status: string
  company?: { id: string; name: string } | null
  locationCity?: string | null
  plannedEndDate?: string | null
  teamMember?: { firstName: string; lastName: string } | null
  deal?: { value?: number | null; currency?: string | null } | null
}

interface Props {
  project: ProjectCardData
  isOverlay?: boolean
}

export function ProjectKanbanCard({ project, isOverlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const isOverdue = project.plannedEndDate && !['completed', 'cancelled'].includes(project.status)
    && new Date(project.plannedEndDate) < new Date()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg border shadow-sm p-3 cursor-grab active:cursor-grabbing select-none space-y-2 ${
        isOverlay ? 'rotate-1 shadow-lg' : 'hover:shadow-md'
      }`}
    >
      <Link
        href={`/projects/${project.id}`}
        className="block font-medium text-sm text-slate-900 hover:text-blue-600 leading-snug"
        onClick={(e) => e.stopPropagation()}
      >
        {project.name}
      </Link>

      {project.company && (
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Building2 className="w-3 h-3 flex-shrink-0" />
          {project.company.name}
        </div>
      )}

      {project.locationCity && (
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          {project.locationCity}
        </div>
      )}

      {project.plannedEndDate && (
        <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
          <CalendarClock className="w-3 h-3 flex-shrink-0" />
          {formatDate(project.plannedEndDate)}
          {isOverdue && ' — überfällig'}
        </div>
      )}
    </div>
  )
}
