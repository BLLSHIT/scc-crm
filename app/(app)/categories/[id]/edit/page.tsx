/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { CategoryForm } from '@/components/categories/CategoryForm'
import { getCategoryById } from '@/lib/db/categories'
import { updateCategory, deleteCategory } from '@/lib/actions/categories.actions'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let profile: Profile | null = null
  let cat: any
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    cat = await getCategoryById(id)
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Kategorie laden" err={err} />
  }

  if (!cat) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          Kategorie nicht gefunden.
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title="Kategorie bearbeiten"
        profile={profile}
        actions={
          <form
            action={async () => {
              'use server'
              await deleteCategory(id)
              redirect('/categories')
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
        <CategoryForm
          title="Kategorie bearbeiten"
          defaultValues={{
            name: cat.name ?? '',
            sortOrder: cat.sortOrder ?? 0,
            isActive: cat.isActive ?? true,
          }}
          onSubmit={updateCategory.bind(null, id)}
        />
      </main>
    </div>
  )
}
