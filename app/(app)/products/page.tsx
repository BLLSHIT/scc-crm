/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProducts } from '@/lib/db/products'
import { getCategories } from '@/lib/db/categories'
import { Header } from '@/components/layout/Header'
import { SearchBar } from '@/components/layout/SearchBar'
import { CategoryFilter } from '@/components/layout/CategoryFilter'
import { buttonVariants } from '@/components/ui/button'
import { Plus, Package, Lock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>
}) {
  const params = await searchParams
  let profile: Profile | null = null
  let products: any[] = []
  let categories: any[] = []

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null

    const [prodResult, catResult] = await Promise.all([
      getProducts({ q: params.q, category: params.category }),
      getCategories(),
    ])
    products = prodResult
    categories = catResult.filter((c: any) => c.isActive)
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Produkte laden" err={err} />
  }

  try {
    return (
      <div className="flex-1 overflow-auto">
        <Header
          title={`Produkte (${products.length})`}
          profile={profile}
          actions={
            <Link href="/products/new" className={buttonVariants({ size: 'sm' })}>
              <Plus className="w-4 h-4 mr-2" />
              Produkt
            </Link>
          }
        />
        <main className="p-6 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <SearchBar placeholder="Produkte durchsuchen…" />
            <CategoryFilter options={categories} />
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="w-16"></th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Kategorie</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Einheit</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">VK netto</th>
                  <th className="text-right px-4 py-3 font-medium text-amber-700" title="Intern · nicht auf Angebot/Rechnung">
                    <span className="inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      EK netto
                    </span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">MwSt</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      Keine Produkte gefunden.{' '}
                      <Link href="/products/new" className="text-blue-600 hover:underline">
                        Neues anlegen
                      </Link>
                    </td>
                  </tr>
                )}
                {products.map((p: any) => {
                  const vk = Number(p.defaultPriceNet ?? 0)
                  const ek = Number(p.purchasePriceNet ?? 0)
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-10 h-10 object-cover rounded border bg-slate-50"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded border bg-slate-50 flex items-center justify-center">
                            <Package className="w-4 h-4 text-slate-300" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/products/${p.id}/edit`}
                          className="font-medium text-slate-900 hover:text-blue-600"
                        >
                          {p.name}
                        </Link>
                        {p.sku && <p className="text-xs text-slate-500">SKU: {p.sku}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.category ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{p.unit}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(vk, 'EUR')}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-700 font-medium">
                        {formatCurrency(ek, 'EUR')}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">{Number(p.defaultVatRate ?? 0)}%</td>
                      <td className="px-4 py-3">
                        {p.isActive ? (
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
                  )
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    )
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Produkte rendern" err={err} />
  }
}
