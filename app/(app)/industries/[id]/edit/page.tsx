/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { LookupForm } from '@/components/lookup/LookupForm'
import { getIndustryById } from '@/lib/db/industries'
import { updateIndustry, deleteIndustry } from '@/lib/actions/industries.actions'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function EditIndustryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let profile: Profile | null = null
  let row: any
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    row = await getIndustryById(id)
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Branche laden" err={err} />
  }
  if (!row) return <div className="p-6">Nicht gefunden.</div>
  return (
    <div className="flex-1 overflow-auto">
      <Header
        title="Branche bearbeiten"
        profile={profile}
        actions={
          <form
            action={async () => { 'use server'; await deleteIndustry(id); redirect('/industries') }}
          >
            <Button size="sm" variant="destructive" type="submit">
              <Trash2 className="w-4 h-4 mr-2" />Löschen
            </Button>
          </form>
        }
      />
      <main className="p-6">
        <LookupForm
          title="Branche bearbeiten"
          nounPlaceholder="z.B. Sportstätte"
          defaultValues={{
            name: row.name ?? '',
            sortOrder: row.sortOrder ?? 0,
            isActive: row.isActive ?? true,
          }}
          onSubmit={updateIndustry.bind(null, id)}
        />
      </main>
    </div>
  )
}
