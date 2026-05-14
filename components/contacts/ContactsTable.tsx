'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronUp, ChevronDown, ChevronsUpDown, Mail, Phone } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

type Direction = 'asc' | 'desc'
type SortKey = 'name' | 'company' | 'position' | 'createdAt'

interface Props {
  contacts: any[]
}

export function ContactsTable({ contacts }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [direction, setDirection] = useState<Direction>('desc')

  const sorted = useMemo(() => {
    const arr = [...contacts]
    const dir = direction === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      let av: any, bv: any
      switch (sortKey) {
        case 'name':
          av = `${a.lastName ?? ''} ${a.firstName ?? ''}`.toLowerCase()
          bv = `${b.lastName ?? ''} ${b.firstName ?? ''}`.toLowerCase()
          break
        case 'company':
          av = (a.company?.name ?? '').toLowerCase()
          bv = (b.company?.name ?? '').toLowerCase()
          break
        case 'position':
          av = (a.position ?? '').toLowerCase()
          bv = (b.position ?? '').toLowerCase()
          break
        case 'createdAt':
          av = a.createdAt ?? ''
          bv = b.createdAt ?? ''
          break
      }
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0
    })
    return arr
  }, [contacts, sortKey, direction])

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
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="flex items-center font-medium text-slate-600 hover:text-slate-900"
      >
        {label}<SortIcon k={k} />
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="text-left px-4 py-3"><SortableHeader k="name" label="Name" /></th>
            <th className="text-left px-4 py-3"><SortableHeader k="company" label="Firma" /></th>
            <th className="text-left px-4 py-3"><SortableHeader k="position" label="Position" /></th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Kontakt</th>
            <th className="text-left px-4 py-3"><SortableHeader k="createdAt" label="Erstellt" /></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                Noch keine Kontakte.{' '}
                <Link href="/contacts/new" className="text-blue-600 hover:underline">
                  Ersten Kontakt anlegen
                </Link>
              </td>
            </tr>
          )}
          {sorted.map((c: any) => (
            <tr key={c.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3">
                <Link href={`/contacts/${c.id}`}
                  className="font-medium text-slate-900 hover:text-blue-600">
                  {c.firstName} {c.lastName}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600">{c.company?.name ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">{c.position ?? '—'}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {c.email && (
                    <a href={`mailto:${c.email}`}
                      className="text-slate-400 hover:text-blue-600" title={c.email}>
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                  {c.phone && (
                    <a href={`tel:${c.phone}`}
                      className="text-slate-400 hover:text-slate-700" title={c.phone}>
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
