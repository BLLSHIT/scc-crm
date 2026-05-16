'use client'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Building2,
  User,
  UserCheck,
  MapPin,
  CheckSquare,
  FileText,
  Paperclip,
  Truck,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export interface DealCardData {
  id: string
  title: string
  value: number | string
  currency: string
  expectedCloseAt?: string | null
  plannedDelivery?: string | null
  company?: { id: string; name: string } | null
  primaryContactName?: string | null
  scc?: { firstName: string; lastName: string } | null
  locationCity?: string | null
  quotesCount?: number
  acceptedQuoteTotal?: number | null
  latestQuoteTotal?: number | null
  latestQuoteStatus?: string | null
  attachmentsCount?: number
  openTasksCount?: number
  marginPercent?: number | null
  marginEuro?: number | null
  stageId: string
}

interface DealCardProps {
  deal: DealCardData
  isOverlay?: boolean
}

export function DealCard({ deal, isOverlay = false }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id })

  const style = { transform: CSS.Transform.toString(transform), transition }

  const displayValue =
    deal.acceptedQuoteTotal != null ? deal.acceptedQuoteTotal :
    deal.latestQuoteTotal != null ? deal.latestQuoteTotal :
    Number(deal.value)

  const quoteHint =
    deal.acceptedQuoteTotal != null ? 'aus akzept. Angebot' :
    deal.latestQuoteTotal != null
      ? (deal.latestQuoteStatus === 'sent' ? 'aus Angebot (Gesendet)' : 'aus Angebot (Entwurf)')
      : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow select-none space-y-1.5 ${
        isDragging && !isOverlay ? 'opacity-40' : ''
      }`}
    >
      <Link
        href={`/deals/${deal.id}`}
        className="block space-y-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-medium text-sm text-slate-900 line-clamp-2">
          {deal.title}
        </p>

        <div className="flex items-baseline justify-between gap-2">
          <p className="text-base font-bold text-blue-600">
            {formatCurrency(displayValue, deal.currency)}
          </p>
          {deal.marginPercent != null && (
            <span className={`text-[10px] font-medium ${
              deal.marginPercent >= 30 ? 'text-emerald-600' :
              deal.marginPercent >= 10 ? 'text-amber-600' : 'text-red-600'
            }`}>
              Marge {deal.marginPercent.toFixed(0)}%
              {deal.marginEuro != null && ` / ${formatCurrency(deal.marginEuro, deal.currency)}`}
            </span>
          )}
        </div>

        {quoteHint && (
          <p className="text-[10px] text-slate-400 italic -mt-1">{quoteHint}</p>
        )}

        {deal.company && (
          <p className="flex items-center gap-1 text-xs text-slate-600">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{deal.company.name}</span>
          </p>
        )}
        {deal.primaryContactName && (
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{deal.primaryContactName}</span>
          </p>
        )}
        {deal.scc && (
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <UserCheck className="w-3 h-3 flex-shrink-0 text-blue-600" />
            <span className="truncate">SCC: {deal.scc.firstName} {deal.scc.lastName}</span>
          </p>
        )}
        {deal.locationCity && (
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{deal.locationCity}</span>
          </p>
        )}
        {deal.plannedDelivery && (
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <Truck className="w-3 h-3 flex-shrink-0" />
            Geplante Umsetzung: {formatDate(deal.plannedDelivery)}
          </p>
        )}

        {(deal.quotesCount || deal.attachmentsCount || deal.openTasksCount) ? (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
            {!!deal.quotesCount && (
              <span className="flex items-center gap-0.5" title={`${deal.quotesCount} Angebot(e)`}>
                <FileText className="w-3 h-3" />
                {deal.quotesCount}
              </span>
            )}
            {!!deal.attachmentsCount && (
              <span className="flex items-center gap-0.5" title={`${deal.attachmentsCount} Datei(en)`}>
                <Paperclip className="w-3 h-3" />
                {deal.attachmentsCount}
              </span>
            )}
            {!!deal.openTasksCount && (
              <span className="flex items-center gap-0.5 text-amber-700"
                title={`${deal.openTasksCount} offene Aufgabe(n)`}>
                <CheckSquare className="w-3 h-3" />
                {deal.openTasksCount}
              </span>
            )}
          </div>
        ) : null}
      </Link>
    </div>
  )
}
