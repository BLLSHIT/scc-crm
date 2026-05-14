/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { LookupForm } from '@/components/lookup/LookupForm'
import { getLeadSourceById } from '@/lib/db/lead-sources'
import { updateLeadSource, deleteLeadSource } from '@/lib/actions/lead-sources.actions'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function EditLeadSourcePage({
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
    row = await getLeadSourceById(id)
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Lead-Quelle laden" err={err} />
  }
  if (!row) return <div className="p-6">Nicht gefunden.</div>
  return (
    <div className="flex-1 overflow-auto">
      <Header
        title="Lead-Quelle bearbeiten"
        profile={profile}
        actions={
          <form
            action={async () => { 'use server'; await deleteLeadSource(id); redirect('/lead-sources') }}
          >
            <Button size="sm" variant="destructive" type="submit">
              <Trash2 className="w-4 h-4 mr-2" />Löschen
            </Button>
          </form>
        }
      />
      <main className="p-6">
        <LookupForm
          title="Lead-Quelle bearbeiten"
          nounPlaceholder="z.B. Website"
          defaultValues={{
            name: row.name ?? '',
            sortOrder: row.sortOrder ?? 0,
            isActive: row.isActive ?? true,
          }}
          onSubmit={updateLeadSource.bind(null, id)}
        />
      </main>
    </div>
  )
}
