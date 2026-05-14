import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { LookupForm } from '@/components/lookup/LookupForm'
import { createLeadSource } from '@/lib/actions/lead-sources.actions'
import type { Profile } from '@/types/app.types'

export default async function NewLeadSourcePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return (
    <div className="flex-1 overflow-auto">
      <Header title="Neue Lead-Quelle" profile={(profile as Profile) ?? null} />
      <main className="p-6">
        <LookupForm
          title="Lead-Quelle anlegen"
          nounPlaceholder="z.B. Website"
          onSubmit={createLeadSource}
        />
      </main>
    </div>
  )
}
