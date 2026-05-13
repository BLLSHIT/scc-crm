/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getContactById } from '@/lib/db/contacts'
import { deleteContact } from '@/lib/actions/contacts.actions'
import { Header } from '@/components/layout/Header'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Phone, Smartphone, Linkedin, Instagram, Building2, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Profile } from '@/types/app.types'

function isFrameworkError(err: any): boolean {
  // Next.js redirect() / notFound() throw errors with these digests
  const d = err?.digest
  if (typeof d === 'string') {
    return d.startsWith('NEXT_REDIRECT') || d === 'NEXT_NOT_FOUND'
  }
  return false
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

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Step 1: auth
  let user: { id: string } | null
  let profile: Profile | null = null
  try {
    const supabase = await createClient()
    const { data: userData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    user = userData.user
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (profileResult.error) {
      // Profile missing is not fatal — render with null
      console.error('[contact-detail] profile error:', profileResult.error)
    }
    profile = (profileResult.data as Profile) ?? null
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Auth/Profile" err={err} />
  }

  // Step 2: contact
  let contact: any
  try {
    contact = await getContactById(id)
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="getContactById" err={err} />
  }
  if (!contact) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          Kontakt nicht gefunden.
        </div>
      </div>
    )
  }

  // Step 3: render
  try {
    return (
      <div className="flex-1 overflow-auto">
        <Header
          title={`${contact.firstName ?? ''} ${contact.lastName ?? ''}`}
          profile={profile}
          actions={
            <div className="flex gap-2">
              <Link
                href={`/contacts/${id}/edit`}
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Bearbeiten
              </Link>
              <form
                action={async () => {
                  'use server'
                  await deleteContact(id)
                }}
              >
                <Button size="sm" variant="destructive" type="submit">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </Button>
              </form>
            </div>
          }
        />
        <main className="p-6 grid grid-cols-3 gap-6">
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
                {contact.mobile && (
                  <div>
                    <p className="text-slate-500 mb-1">Mobil</p>
                    <a href={`tel:${contact.mobile}`} className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      {contact.mobile}
                    </a>
                  </div>
                )}
                {contact.linkedin && (
                  <div>
                    <p className="text-slate-500 mb-1">LinkedIn</p>
                    <a
                      href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline break-all"
                    >
                      <Linkedin className="w-4 h-4" />
                      {contact.linkedin}
                    </a>
                  </div>
                )}
                {contact.instagram && (
                  <div>
                    <p className="text-slate-500 mb-1">Instagram</p>
                    <a
                      href={
                        contact.instagram.startsWith('http')
                          ? contact.instagram
                          : `https://instagram.com/${contact.instagram.replace(/^@/, '')}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-pink-600 hover:underline"
                    >
                      <Instagram className="w-4 h-4" />
                      {contact.instagram}
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

            {Array.isArray(contact.deals) && contact.deals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Verknüpfte Deals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {contact.deals.map((dc: any) => (
                    <Link
                      key={dc.deal?.id}
                      href={`/deals/${dc.deal?.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:border-blue-300 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{dc.deal?.title}</p>
                        {dc.role && <p className="text-xs text-slate-500">{dc.role}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {formatCurrency(dc.deal?.value ?? 0, dc.deal?.currency ?? 'EUR')}
                        </p>
                        {dc.deal?.stage && (
                          <Badge
                            style={{
                              backgroundColor: (dc.deal.stage.color ?? '#6366f1') + '20',
                              color: dc.deal.stage.color ?? '#6366f1',
                              borderColor: (dc.deal.stage.color ?? '#6366f1') + '40',
                            }}
                            variant="outline"
                          >
                            {dc.deal.stage.name}
                          </Badge>
                        )}
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
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Render" err={err} />
  }
}
