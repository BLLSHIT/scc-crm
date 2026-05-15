'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronUp, ChevronDown, ChevronsUpDown, Mail } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

type Direction = 'asc' | 'desc'
type SortKey = 'name' | 'industry' | 'city' | 'tier' | 'createdAt'

const TIER_LABEL: Record<string, string> = {
  premium: 'Premium',
  key_account: 'Key Account',
  standard: 'Standard',
}
const TIER_BADGE: Record<string, string> = {
  premium: 'bg-amber-100 text-amber-800',
  key_account: 'bg-violet-100 text-violet-800',
  standard: 'bg-slate-100 text-slate-600',
}

const TIER_FILTERS: { label: string; value?: string }[] = [
  { label: 'Alle' },
  { label: 'Premium', value: 'premium' },
  { label: 'Key Account', value: 'key_account' },
  { label: 'Standard', value: 'standard' },
  { label: 'Ohne Tier', value: 'none' },
]

interface Props {
  companies: any[]
}

export function CompaniesTable({ companies }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [direction, setDirection] = useState<Direction>('asc')
  const [tierFilter, setTierFilter] = useState<string | undefined>(undefined)

  const filtered = useMemo(() => {
    if (!tierFilter) return companies
    if (tierFilter === 'none') return companies.filter((c) => !c.tier)
    return companies.filter((c) => c.tier === tierFilter)
  }, [companies, tierFilter])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    const dir = direction === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      let av: any, bv: any
      switch (sortKey) {
        case 'name':
          av = (a.name ?? '').toLowerCase()
          bv = (b.name ?? '').toLowerCase()
          break
        case 'industry':
          av = (a.industry ?? '').toLowerCase()
          bv = (b.industry ?? '').toLowerCase()
          break
        case 'city':
          av = ((a.city ?? '') + (a.country ?? '')).toLowerCase()
          bv = ((b.city ?? '') + (b.country ?? '')).toLowerCase()
          break
        case 'tier':
          // Premium > Key Account > Standard > none
          const tierOrder: Record<string, number> = { premium: 3, key_account: 2, standard: 1 }
          av = tierOrder[a.tier as string] ?? 0
          bv = tierOrder[b.tier as string] ?? 0
          break
        case 'createdAt':
          av = a.createdAt ?? ''
          bv = b.createdAt ?? ''
          break
      }
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0
    })
    return arr
  }, [filtered, sortKey, direction])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setDirection('asc')
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 inline ml-1 text-slate-300" />
    return direction === 'asc'
      ? <ChevronUp className="w-3 h-3 inline ml-1 text-slate-700" />
      : <ChevronDown className="w-3 h-3 inline ml-1 text-slate-700" />
  }

  function SortableHeader({ k, label }: { k: SortKey; label: string }) {
    return (
      <button type="button" onClick={() => toggleSort(k)}
        className="flex items-center font-medium text-slate-600 hover:text-slate-900">
        {label}<SortIcon k={k} />
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {/* Tier-Filter */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-slate-500 mr-1">Tier:</span>
        {TIER_FILTERS.map((f) => {
          const active = (tierFilter ?? undefined) === f.value
          return (
            <button
              key={f.label}
              type="button"
              onClick={() => setTierFilter(f.value)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3"><SortableHeader k="name" label="Name" /></th>
              <th className="text-left px-4 py-3"><SortableHeader k="industry" label="Branche" /></th>
              <th className="text-left px-4 py-3"><SortableHeader k="city" label="Standort" /></th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">E-Mail</th>
              <th className="text-left px-4 py-3"><SortableHeader k="tier" label="Tier" /></th>
              <th className="text-left px-4 py-3"><SortableHeader k="createdAt" label="Erstellt" /></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                  Keine Firmen gefunden.
                </td>
              </tr>
            )}
            {sorted.map((c: any) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/companies/${c.id}`}
                    className="font-medium text-slate-900 hover:text-blue-600">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{c.industry ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {c.city && c.country ? `${c.city}, ${c.country}` : c.city ?? c.country ?? '—'}
                </td>
                <td className="px-4 py-3">
                  {c.email && (
                    <a href={`mailto:${c.email}`}
                      className="text-slate-400 hover:text-blue-600" title={c.email}>
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                </td>
                <td className="px-4 py-3">
                  {c.tier ? (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${TIER_BADGE[c.tier] ?? ''}`}>
                      {TIER_LABEL[c.tier] ?? c.tier}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
