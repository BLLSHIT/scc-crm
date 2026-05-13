'use client'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { DealCard, type DealCardData } from './DealCard'
import { formatCurrency } from '@/lib/utils/format'

interface Stage {
  id: string
  name: string
  color: string
}

interface DealColumnProps {
  stage: Stage
  deals: DealCardData[]
}

export function DealColumn({ stage, deals }: DealColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const total = deals.reduce((sum, d) => sum + Number(d.value), 0)

  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-semibold text-sm text-slate-700">{stage.name}</h3>
          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
            {deals.length}
          </span>
        </div>
        <span className="text-xs font-medium text-slate-500">
          {formatCurrency(total)}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-32 space-y-2 p-2 rounded-xl transition-colors ${
          isOver ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-slate-100'
        }`}
      >
        <SortableContext
          items={deals.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
