/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { CompanyForm } from '@/components/companies/CompanyForm'
import { createCompany } from '@/lib/actions/companies.actions'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function NewCompanyPage() {
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

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Neue Firma" profile={profile} />
      <main className="p-6">
        <CompanyForm title="Firma erstellen" onSubmit={createCompany} />
      </main>
    </div>
  )
}
