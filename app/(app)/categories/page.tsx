/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCategories } from '@/lib/db/categories'
import { Header } from '@/components/layout/Header'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function CategoriesPage() {
  let profile: Profile | null = null
  let categories: any[] = []
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    categories = await getCategories()
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Kategorien laden" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`Kategorien (${categories.length})`}
        profile={profile}
        actions={
          <Link href="/categories/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="w-4 h-4 mr-2" />
            Kategorie
          </Link>
        }
      />
      <main className="p-6">
        <p className="text-sm text-slate-500 mb-4">
          Kategorien werden bei der Produkt-Anlage zum Auswählen angeboten und
          dienen als Filter in der Produkt-Liste.
        </p>
        <div className="bg-white rounded-xl border overflow-hidden max-w-2xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Reihenfolge</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-slate-400">
                    Noch keine Kategorien.
                  </td>
                </tr>
              )}
              {categories.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/categories/${c.id}/edit`}
                      className="font-medium text-slate-900 hover:text-blue-600"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">{c.sortOrder}</td>
                  <td className="px-4 py-3">
                    {c.isActive ? (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">
                        Aktiv
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500">
                        Inaktiv
                      </span>
                    )}
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
