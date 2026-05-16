import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTemplateSets, getTemplateOptions } from '@/lib/db/templates'
import { TemplateSetsClient } from '@/components/templates/TemplateSetsClient'
import { Header } from '@/components/layout/Header'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function TemplateSetsPage() {
  let profile: Profile | null = null
  let sets: Awaited<ReturnType<typeof getTemplateSets>> = []
  let options: Awaited<ReturnType<typeof getTemplateOptions>> = { milestones: [], punchlists: [], materials: [], sets: [] }
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect('/login')
    const pr = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = pr.data as Profile;
    [sets, options] = await Promise.all([getTemplateSets(), getTemplateOptions()])
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Vorlagen-Sets" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title={`Vorlagen-Sets (${sets.length})`} profile={profile} />
      <TemplateSetsClient sets={sets} options={options} />
    </div>
  )
}
