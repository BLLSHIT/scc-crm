import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { CompanyForm } from '@/components/companies/CompanyForm'
import { createCompany } from '@/lib/actions/companies.actions'
import type { Profile } from '@/types/app.types'

export default async function NewCompanyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user!.id).single()

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Neue Firma" profile={profile as Profile} />
      <main className="p-6">
        <CompanyForm title="Firma erstellen" onSubmit={createCompany} />
      </main>
    </div>
  )
}
