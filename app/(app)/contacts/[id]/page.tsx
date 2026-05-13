import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getContactById } from '@/lib/db/contacts'
import { deleteContact } from '@/lib/actions/contacts.actions'
import { Header } from '@/components/layout/Header'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Phone, Building2, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Profile } from '@/types/app.types'

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user!.id).single()

  let contact: any
  try {
    contact = await getContactById(id)
  } catch {
    notFound()
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`${contact.firstName} ${contact.lastName}`}
        profile={profile as Profile}
        actions={
          <div className="flex gap-2">
            <Link
              href={`/contacts/${id}/edit`}
              className={buttonVariants({ size: 'sm', variant: 'outline' })}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Bearbeiten
            </Link>
            <form action={async () => { await deleteContact(id) }}>
              <Button size="sm" variant="destructive" type="submit">
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
            </form>
          </div>
        }
      />
      <main className="p-6 grid grid-cols-3 gap-6">
        {/* Left column */}
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kontaktdaten</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              {contact.email && (
                <div>
                  <p className="text-slate-500 mb-1">E-Mail</p>
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <Mail className="w-4 h-4" />
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div>
                  <p className="text-slate-500 mb-1">Telefon</p>
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.position && (
                <div>
                  <p className="text-slate-500 mb-1">Position</p>
                  <p>{contact.position}</p>
                </div>
              )}
              {contact.source && (
                <div>
                  <p className="text-slate-500 mb-1">Quelle</p>
                  <p>{contact.source}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {contact.deals?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Verknüpfte Deals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contact.deals.map((dc: any) => (
                  <Link
                    key={dc.deal.id}
                    href={`/deals/${dc.deal.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:border-blue-300 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{dc.deal.title}</p>
                      {dc.role && (
                        <p className="text-xs text-slate-500">{dc.role}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        {formatCurrency(dc.deal.value, dc.deal.currency)}
                      </p>
                      <Badge
                        style={{
                          backgroundColor: dc.deal.stage.color + '20',
                          color: dc.deal.stage.color,
                          borderColor: dc.deal.stage.color + '40',
                        }}
                        variant="outline"
                      >
                        {dc.deal.stage.name}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {contact.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notizen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {contact.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Firma</CardTitle>
            </CardHeader>
            <CardContent>
              {contact.company ? (
                <Link
                  href={`/companies/${contact.company.id}`}
                  className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                >
                  <Building2 className="w-4 h-4" />
                  {contact.company.name}
                </Link>
              ) : (
                <p className="text-slate-400 text-sm">Keine Firma verknüpft</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Info</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Erstellt</span>
                <span>{formatDate(contact.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Geändert</span>
                <span>{formatDate(contact.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
