/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDealById } from '@/lib/db/deals'
import { getQuotesByDealId } from '@/lib/db/quotes'
import { getActivityLogs } from '@/lib/db/activity-logs'
import { deleteDeal } from '@/lib/actions/deals.actions'
import { ActivityTimeline } from '@/components/activity/ActivityTimeline'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, Pencil, Trash2, Calendar, UserCheck, Mail, Phone, FileText, Plus } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Profile } from '@/types/app.types'

function isFrameworkError(err: any): boolean {
  const d = err?.digest
  return typeof d === 'string' && (d.startsWith('NEXT_REDIRECT') || d === 'NEXT_NOT_FOUND')
}

function ErrorView({ where, err }: { where: string; err: any }) {
  return (
    <div className="flex-1 p-6">
      <div className="max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 space-y-3">
        <h2 className="font-semibold text-red-800">Fehler in {where}</h2>
        <pre className="text-xs text-red-700 whitespace-pre-wrap break-all bg-white border border-red-100 rounded p-3">
{`name:    ${err?.name ?? '(none)'}
message: ${err?.message ?? String(err)}
code:    ${err?.code ?? '(none)'}
hint:    ${err?.hint ?? '(none)'}
details: ${err?.details ?? '(none)'}
digest:  ${err?.digest ?? '(none)'}

stack:
${err?.stack ?? '(none)'}`}
        </pre>
      </div>
    </div>
  )
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let profile: Profile | null = null
  try {
    const supabase = await createClient()
    const { data: userData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!userData.user) redirect('/login')
    const profileResult = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single()
    profile = (profileResult.data as Profile) ?? null
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Auth/Profile" err={err} />
  }

  let deal: any
  let dealQuotes: any[] = []
  let activities: any[] = []
  try {
    deal = await getDealById(id)
    dealQuotes = await getQuotesByDealId(id)
    activities = await getActivityLogs('deal', id, 30)
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="getDealById" err={err} />
  }
  if (!deal) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          Deal nicht gefunden.
        </div>
      </div>
    )
  }

  try {
    return (
      <div className="flex-1 overflow-auto">
        <Header
          title={deal.title ?? '(ohne Titel)'}
          profile={profile}
          actions={
            <div className="flex gap-2">
              <Link
                href={`/quotes/new?dealId=${id}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileText className="w-4 h-4" />Neues Angebot
              </Link>
              <Link
                href={`/deals/${id}/edit`}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Pencil className="w-4 h-4" />Bearbeiten
              </Link>
              <form
                action={async () => {
                  'use server'
                  await deleteDeal(id)
                }}
              >
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />Löschen
                </button>
              </form>
            </div>
          }
        />
        <main className="p-6 grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Deal-Übersicht</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 mb-1">Wert</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(deal.value ?? 0, deal.currency ?? 'EUR')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Phase</p>
                  {deal.stage && (
                    <Badge
                      style={{
                        backgroundColor: (deal.stage.color ?? '#6366f1') + '20',
                        color: deal.stage.color ?? '#6366f1',
                      }}
                      variant="outline"
                    >
                      {deal.stage.name}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Wahrscheinlichkeit</p>
                  <p>{deal.probability ?? 0}%</p>
                </div>
                {deal.expectedCloseAt && (
                  <div>
                    <p className="text-slate-500 mb-1">Erwarteter Abschluss</p>
                    <p className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {formatDate(deal.expectedCloseAt)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {Array.isArray(deal.contacts) && deal.contacts.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Ansprechpartner</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {deal.contacts.map((dc: any) => (
                    <Link
                      key={dc.contact?.id}
                      href={`/contacts/${dc.contact?.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium">
                            {dc.contact?.firstName} {dc.contact?.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{dc.contact?.position}</p>
                        </div>
                      </div>
                      {dc.role && <span className="text-xs text-slate-400">{dc.role}</span>}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {deal.description && (
              <Card>
                <CardHeader><CardTitle>Beschreibung</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{deal.description}</p>
                </CardContent>
              </Card>
            )}

            <ActivityTimeline items={activities} />
          </div>

          <div className="space-y-6">
            {deal.teamMember && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    Ansprechpartner SCC
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="font-medium text-slate-900">
                    {deal.teamMember.firstName} {deal.teamMember.lastName}
                  </p>
                  {deal.teamMember.position && (
                    <p className="text-slate-500">{deal.teamMember.position}</p>
                  )}
                  {deal.teamMember.email && (
                    <a
                      href={`mailto:${deal.teamMember.email}`}
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <Mail className="w-3 h-3" />
                      {deal.teamMember.email}
                    </a>
                  )}
                  {deal.teamMember.mobile && (
                    <a
                      href={`tel:${deal.teamMember.mobile}`}
                      className="flex items-center gap-2 text-slate-700 hover:text-blue-600"
                    >
                      <Phone className="w-3 h-3" />
                      {deal.teamMember.mobile}
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Verknüpfte Angebote */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    Angebote ({dealQuotes.length})
                  </CardTitle>
                  <Link
                    href={`/quotes/new?dealId=${id}`}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Neu
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {dealQuotes.length === 0 ? (
                  <p className="text-xs text-slate-400">Noch kein Angebot.</p>
                ) : (
                  <ul className="space-y-2">
                    {dealQuotes.map((q) => (
                      <li key={q.id}>
                        <Link
                          href={`/quotes/${q.id}`}
                          className="block p-2 -mx-2 rounded hover:bg-slate-50"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-blue-600 font-medium">
                              {q.quoteNumber}
                            </span>
                            <span className="text-xs font-medium">
                              {formatCurrency(Number(q.totalGross ?? 0), 'EUR')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 truncate">{q.title}</p>
                          <p className="text-xs text-slate-400 capitalize">{q.status}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {deal.company && (
              <Card>
                <CardHeader><CardTitle>Firma</CardTitle></CardHeader>
                <CardContent>
                  <Link
                    href={`/companies/${deal.company.id}`}
                    className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                  >
                    <Building2 className="w-4 h-4" />
                    {deal.company.name}
                  </Link>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle>Info</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pipeline</span>
                  <span>{deal.pipeline?.name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Erstellt</span>
                  <span>{formatDate(deal.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Render" err={err} />
  }
}
