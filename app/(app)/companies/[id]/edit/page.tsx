import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyById } from '@/lib/db/companies'
import { updateCompany } from '@/lib/actions/companies.actions'
import { Header } from '@/components/layout/Header'
import { CompanyForm } from '@/components/companies/CompanyForm'
import type { Profile } from '@/types/app.types'

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user!.id).single()

  let company: any
  try {
    company = await getCompanyById(id)
  } catch {
    notFound()
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Firma bearbeiten" profile={profile as Profile} />
      <main className="p-6">
        <CompanyForm
          title="Firma bearbeiten"
          defaultValues={{
            name: company.name,
            website: company.website ?? '',
            industry: company.industry ?? '',
            size: company.size ?? '',
            country: company.country ?? '',
            city: company.city ?? '',
            phone: company.phone ?? '',
            email: company.email ?? '',
            tags: company.tags ?? [],
          }}
          onSubmit={(data) => updateCompany(id, data)}
        />
      </main>
    </div>
  )
}
