import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDealById } from '@/lib/db/deals'
import { deleteDeal } from '@/lib/actions/deals.actions'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, Pencil, Trash2, Calendar } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Profile } from '@/types/app.types'

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user!.id).single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let deal: any
  try { deal = await getDealById(id) } catch { notFound() }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={deal.title}
        profile={profile as Profile}
        actions={
          <div className="flex gap-2">
            <Link
              href={`/deals/${id}/edit`}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Pencil className="w-4 h-4" />Bearbeiten
            </Link>
            <form action={async () => { await deleteDeal(id) }}>
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
                  {formatCurrency(deal.value, deal.currency)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Phase</p>
                <Badge
                  style={{
                    backgroundColor: deal.stage?.color + '20',
                    color: deal.stage?.color,
                  }}
                  variant="outline"
                >
                  {deal.stage?.name}
                </Badge>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Wahrscheinlichkeit</p>
                <p>{deal.probability}%</p>
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

          {deal.contacts?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Stakeholder</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {deal.contacts.map((dc: any) => (
                  <Link
                    key={dc.contact.id}
                    href={`/contacts/${dc.contact.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium">
                          {dc.contact.firstName} {dc.contact.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{dc.contact.position}</p>
                      </div>
                    </div>
                    {dc.role && (
                      <span className="text-xs text-slate-400">{dc.role}</span>
                    )}
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
        </div>

        <div className="space-y-6">
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
                <span>{deal.pipeline?.name}</span>
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
}
