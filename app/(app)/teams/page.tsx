import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import type { Profile } from '@/types/app.types'

export default async function TeamsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Teams" profile={profile as Profile} />
      <main className="p-6">
        <div className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-slate-200 gap-3">
          <p className="text-2xl">👥</p>
          <p className="text-slate-600 font-medium">Teams — kommt bald</p>
          <p className="text-slate-400 text-sm text-center max-w-sm">
            Dieses Modul wird in einer späteren Phase freigeschaltet.
            Hier verwaltest du deine Vertriebs- und Projektteams.
          </p>
        </div>
      </main>
    </div>
  )
}
