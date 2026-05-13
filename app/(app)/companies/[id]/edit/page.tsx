/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyById } from '@/lib/db/companies'
import { updateCompany } from '@/lib/actions/companies.actions'
import { Header } from '@/components/layout/Header'
import { CompanyForm } from '@/components/companies/CompanyForm'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function EditCompanyPage({
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

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Firma bearbeiten" profile={profile} />
      <main className="p-6">
        <CompanyForm
          title="Firma bearbeiten"
          defaultValues={{
            name: company.name ?? '',
            website: company.website ?? '',
            industry: company.industry ?? '',
            size: company.size ?? '',
            country: company.country ?? '',
            city: company.city ?? '',
            phone: company.phone ?? '',
            email: company.email ?? '',
            tags: company.tags ?? [],
          }}
          onSubmit={updateCompany.bind(null, id)}
        />
      </main>
    </div>
  )
}
