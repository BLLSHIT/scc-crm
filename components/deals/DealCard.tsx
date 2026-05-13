'use client'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Building2, Calendar } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export interface DealCardData {
  id: string
  title: string
  value: number | string
  currency: string
  expectedCloseAt?: string | null
  company?: { id: string; name: string } | null
  stageId: string
}

interface DealCardProps {
  deal: DealCardData
  isOverlay?: boolean
}

export function DealCard({ deal, isOverlay = false }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow select-none ${
        isDragging && !isOverlay ? 'opacity-40' : ''
      }`}
    >
      <Link
        href={`/deals/${deal.id}`}
        className="block"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-medium text-sm text-slate-900 mb-2 line-clamp-2">
          {deal.title}
        </p>
        <p className="text-base font-bold text-blue-600">
          {formatCurrency(Number(deal.value), deal.currency)}
        </p>
        {deal.company && (
          <p className="flex items-center gap-1 text-xs text-slate-500 mt-1">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            {deal.company.name}
          </p>
        )}
        {deal.expectedCloseAt && (
          <p className="flex items-center gap-1 text-xs text-slate-400 mt-1">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            {formatDate(deal.expectedCloseAt)}
          </p>
        )}
      </Link>
    </div>
  )
}
