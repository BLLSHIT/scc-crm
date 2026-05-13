import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanies } from '@/lib/db/companies'
import { Header } from '@/components/layout/Header'
import { SearchBar } from '@/components/layout/SearchBar'
import { buttonVariants } from '@/components/ui/button'
import { Plus, Mail } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
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
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Branche</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Stadt</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">E-Mail</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Erstellt</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {companies.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    Noch keine Firmen.{' '}
                    <Link href="/companies/new" className="text-blue-600 hover:underline">
                      Erste Firma anlegen
                    </Link>
                  </td>
                </tr>
              )}
              {companies.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/companies/${c.id}`}
                      className="font-medium text-slate-900 hover:text-blue-600"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.industry ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.city && c.country
                      ? `${c.city}, ${c.country}`
                      : c.city ?? c.country ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="text-slate-400 hover:text-blue-600"
                        title={c.email}
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
