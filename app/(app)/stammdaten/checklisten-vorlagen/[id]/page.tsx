import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPunchlistTemplateById } from '@/lib/db/templates'
import { PunchlistTemplateDetail } from '@/components/templates/PunchlistTemplateDetail'
import { Header } from '@/components/layout/Header'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function PunchlistTemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let profile: Profile | null = null
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect('/login')
    const pr = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = pr.data as Profile
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Auth" err={err} />
  }
  const template = await getPunchlistTemplateById(id)
  if (!template) notFound()
  return (
    <div className="flex-1 overflow-auto">
      <Header title="Checklisten-Vorlage" profile={profile} />
      <PunchlistTemplateDetail template={template} />
    </div>
  )
}
