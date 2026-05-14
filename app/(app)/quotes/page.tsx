/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getQuotes, type QuoteStatus } from '@/lib/db/quotes'
import { Header } from '@/components/layout/Header'
import { SearchBar } from '@/components/layout/SearchBar'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

const STATUS_FILTERS: { label: string; value?: QuoteStatus }[] = [
  { label: 'Alle' },
  { label: 'Entwurf', value: 'draft' },
  { label: 'Versendet', value: 'sent' },
  { label: 'Angenommen', value: 'accepted' },
  { label: 'Abgelehnt', value: 'declined' },
  { label: 'Abgelaufen', value: 'expired' },
]

const STATUS_BADGE: Record<QuoteStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
  expired: 'bg-amber-100 text-amber-700',
}

const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Entwurf',
  sent: 'Versendet',
  accepted: 'Angenommen',
  declined: 'Abgelehnt',
  expired: 'Abgelaufen',
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: QuoteStatus }>
}) {
  const params = await searchParams
  let profile: Profile | null = null
  let quotes: any[] = []

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    quotes = await getQuotes({ q: params.q, status: params.status })
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Angebote laden" err={err} />
  }

  try {
    return (
      <div className="flex-1 overflow-auto">
        <Header
          title={`Angebote (${quotes.length})`}
          profile={profile}
          actions={
            <Link href="/quotes/new" className={buttonVariants({ size: 'sm' })}>
              <Plus className="w-4 h-4 mr-2" />
              Angebot
            </Link>
          }
        />
        <main className="p-6 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <SearchBar placeholder="Angebote durchsuchen…" />
            <div className="flex gap-1 flex-wrap">
              {STATUS_FILTERS.map((f) => {
                const active = (params.status ?? undefined) === f.value
                const href = f.value ? `/quotes?status=${f.value}` : '/quotes'
                return (
                  <Link
                    key={f.label}
                    href={href}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Nummer</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Titel</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Kunde</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Summe</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Gültig bis</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {quotes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      Keine Angebote gefunden.{' '}
                      <Link href="/quotes/new" className="text-blue-600 hover:underline">
                        Erstes Angebot anlegen
                      </Link>
                    </td>
                  </tr>
                )}
                {quotes.map((q: any) => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        href={`/quotes/${q.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {q.quoteNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/quotes/${q.id}`}
                        className="font-medium text-slate-900 hover:text-blue-600"
                      >
                        {q.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {q.company?.name ?? (q.contact ? `${q.contact.firstName} ${q.contact.lastName}` : '—')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_BADGE[q.status as QuoteStatus]}`}>
                        {STATUS_LABEL[q.status as QuoteStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(Number(q.totalGross ?? 0), 'EUR')}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(q.validUntil)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    )
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Angebote rendern" err={err} />
  }
}
