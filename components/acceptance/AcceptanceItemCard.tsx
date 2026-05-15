// components/acceptance/AcceptanceItemCard.tsx
'use client'
import { Camera } from 'lucide-react'
import type { AcceptanceItem } from '@/lib/db/acceptance-protocol'

interface Props {
  item: AcceptanceItem
  onEdit: (item: AcceptanceItem) => void
}

const STATUS_CONFIG = {
  ok:          { label: 'OK',           border: 'border-l-green-400',  badge: 'bg-green-100 text-green-700' },
  defect:      { label: 'Mangel',       border: 'border-l-orange-400', badge: 'bg-orange-100 text-orange-700' },
  not_checked: { label: 'Nicht geprüft', border: 'border-l-slate-200',  badge: 'bg-slate-100 text-slate-500' },
}

const PRIORITY_LABEL = { low: 'leicht', medium: 'mittel', critical: 'kritisch' }

export function AcceptanceItemCard({ item, onEdit }: Props) {
  const cfg = STATUS_CONFIG[item.status]

  return (
    <button
      onClick={() => onEdit(item)}
      className={`w-full text-left bg-white rounded-xl p-4 border-l-4 shadow-sm active:scale-[0.99] transition-transform ${cfg.border}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-900 truncate">{item.title}</p>
          {item.notes && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.notes}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
              {cfg.label}
            </span>
            {item.status === 'defect' && item.priority && (
              <span className="text-xs text-orange-600">({PRIORITY_LABEL[item.priority]})</span>
            )}
            {(item.assignee || item.buildTeam) && (
              <span className="text-xs text-slate-400">
                {item.assignee ? `${item.assignee.firstName} ${item.assignee.lastName}` : item.buildTeam?.name}
              </span>
            )}
            {item.photos.length > 0 && (
              <span className="text-xs text-slate-400 flex items-center gap-0.5">
                <Camera className="w-3 h-3" /> {item.photos.length}
              </span>
            )}
          </div>
        </div>
        <span className="text-slate-400 text-lg leading-none flex-shrink-0">›</span>
      </div>
    </button>
  )
}
