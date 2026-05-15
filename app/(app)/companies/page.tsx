import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanies } from '@/lib/db/companies'
import { Header } from '@/components/layout/Header'
import { SearchBar } from '@/components/layout/SearchBar'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CompaniesTable } from '@/components/companies/CompaniesTable'
import type { Profile } from '@/types/app.types'

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const { companies, total } = await getCompanies({
    q: params.q,
    page: params.page ? Number(params.page) : 1,
  })

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`Firmen (${total})`}
        profile={(profile as Profile) ?? null}
        actions={
          <Link href="/companies/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="w-4 h-4 mr-2" />
            Firma
          </Link>
        }
      />
      <main className="p-6 space-y-4">
        <SearchBar placeholder="Firmen durchsuchen…" />
        <CompaniesTable companies={companies} />
      </main>
    </div>
  )
}
