import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ProductForm } from '@/components/products/ProductForm'
import { createProduct } from '@/lib/actions/products.actions'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function NewProductPage() {
  let profile: Profile | null = null
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Auth" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Neues Produkt" profile={profile} />
      <main className="p-6">
        <ProductForm title="Produkt anlegen" onSubmit={createProduct} />
      </main>
    </div>
  )
}
