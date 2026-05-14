/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getIndustries } from '@/lib/db/industries'
import { Header } from '@/components/layout/Header'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function IndustriesPage() {
  let profile: Profile | null = null
  let industries: any[] = []
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    industries = await getIndustries()
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Branchen laden" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`Branchen (${industries.length})`}
        profile={profile}
        actions={
          <Link href="/industries/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="w-4 h-4 mr-2" />
            Branche
          </Link>
        }
      />
      <main className="p-6">
        <p className="text-sm text-slate-500 mb-4">
          Wird im Firmen-Formular als Dropdown angeboten.
        </p>
        <div className="bg-white rounded-xl border overflow-hidden max-w-3xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 w-24">Reihenfolge</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {industries.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-12 text-center text-slate-400">Keine Branchen.</td></tr>
              )}
              {industries.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/industries/${i.id}/edit`} className="font-medium text-slate-900 hover:text-blue-600">
                      {i.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{i.sortOrder}</td>
                  <td className="px-4 py-3">
                    {i.isActive
                      ? <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">Aktiv</span>
                      : <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500">Inaktiv</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
