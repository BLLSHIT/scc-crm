/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ProductForm } from '@/components/products/ProductForm'
import { getProductById } from '@/lib/db/products'
import { updateProduct, deleteProduct } from '@/lib/actions/products.actions'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let profile: Profile | null = null
  let product: any
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    product = await getProductById(id)
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Produkt laden" err={err} />
  }

  if (!product) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">Produkt nicht gefunden.</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title="Produkt bearbeiten"
        profile={profile}
        actions={
          <form
            action={async () => {
              'use server'
              await deleteProduct(id)
              redirect('/products')
            }}
          >
            <Button size="sm" variant="destructive" type="submit">
              <Trash2 className="w-4 h-4 mr-2" />
              Löschen
            </Button>
          </form>
        }
      />
      <main className="p-6">
        <ProductForm
          title="Produkt bearbeiten"
          defaultValues={{
            name: product.name ?? '',
            description: product.description ?? '',
            sku: product.sku ?? '',
            category: product.category ?? '',
            unit: product.unit ?? 'Stück',
            defaultPriceNet: Number(product.defaultPriceNet ?? 0),
            defaultVatRate: Number(product.defaultVatRate ?? 19),
            imageUrl: product.imageUrl ?? '',
            isActive: product.isActive ?? true,
          }}
          onSubmit={updateProduct.bind(null, id)}
        />
      </main>
    </div>
  )
}
