/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyById } from '@/lib/db/companies'
import { deleteCompany } from '@/lib/actions/companies.actions'
import { Header } from '@/components/layout/Header'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Phone, Globe, Pencil, Trash2, User } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function CompanyDetailPage({
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

  let company: any
  try {
    company = await getCompanyById(id)
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="getCompanyById" err={err} />
  }
  if (!company) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          Firma nicht gefunden.
        </div>
      </div>
    )
  }

  try {
    return (
      <div className="flex-1 overflow-auto">
        <Header
          title={company.name ?? '(ohne Namen)'}
          profile={profile}
          actions={
            <div className="flex gap-2">
              <Link
                href={`/companies/${id}/edit`}
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Bearbeiten
              </Link>
              <form
                action={async () => {
                  'use server'
                  await deleteCompany(id)
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
                <CardTitle>Stammdaten</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                {company.website && (
                  <div>
                    <p className="text-slate-500 mb-1">Website</p>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <Globe className="w-4 h-4" />
                      {company.website}
                    </a>
                  </div>
                )}
                {company.industry && (
                  <div>
                    <p className="text-slate-500 mb-1">Branche</p>
                    <p>{company.industry}</p>
                  </div>
                )}
                {company.size && (
                  <div>
                    <p className="text-slate-500 mb-1">Größe</p>
                    <p>{company.size}</p>
                  </div>
                )}
                {company.city && (
                  <div>
                    <p className="text-slate-500 mb-1">Stadt</p>
                    <p>{company.city}</p>
                  </div>
                )}
                {company.country && (
                  <div>
                    <p className="text-slate-500 mb-1">Land</p>
                    <p>{company.country}</p>
                  </div>
                )}
                {company.phone && (
                  <div>
                    <p className="text-slate-500 mb-1">Telefon</p>
                    <a href={`tel:${company.phone}`} className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {company.phone}
                    </a>
                  </div>
                )}
                {company.email && (
                  <div>
                    <p className="text-slate-500 mb-1">E-Mail</p>
                    <a
                      href={`mailto:${company.email}`}
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <Mail className="w-4 h-4" />
                      {company.email}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {Array.isArray(company.contacts) && company.contacts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Kontakte</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {company.contacts.map((contact: any) => (
                    <Link
                      key={contact.id}
                      href={`/contacts/${contact.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="font-medium text-sm">
                            {contact.firstName} {contact.lastName}
                          </p>
                          {contact.position && (
                            <p className="text-xs text-slate-500">{contact.position}</p>
                          )}
                        </div>
                      </div>
                      {contact.email && (
                        <p className="text-xs text-slate-400">{contact.email}</p>
                      )}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {Array.isArray(company.deals) && company.deals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Deals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {company.deals.map((deal: any) => (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:border-blue-300 transition-colors"
                    >
                      <p className="font-medium text-sm">{deal.title}</p>
                      <p className="font-semibold text-sm">
                        {formatCurrency(deal.value ?? 0, deal.currency ?? 'EUR')}
                      </p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Info</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Erstellt</span>
                  <span>{formatDate(company.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Geändert</span>
                  <span>{formatDate(company.updatedAt)}</span>
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
