import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMilestoneTemplates } from '@/lib/db/templates'
import { Header } from '@/components/layout/Header'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import { Plus, ListChecks } from 'lucide-react'
import type { Profile } from '@/types/app.types'

export default async function MilestoneTemplatesPage() {
  let profile: Profile | null = null
  let templates: Awaited<ReturnType<typeof getMilestoneTemplates>> = []
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect('/login')
    const pr = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = pr.data as Profile
    templates = await getMilestoneTemplates()
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Meilenstein-Vorlagen" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`Meilenstein-Vorlagen (${templates.length})`}
        profile={profile}
        actions={
          <Link
            href="/stammdaten/meilenstein-vorlagen/neu"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Neue Vorlage
          </Link>
        }
      />
      <main className="p-6">
        {templates.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Noch keine Meilenstein-Vorlagen.</p>
            <Link href="/stammdaten/meilenstein-vorlagen/neu" className="mt-2 inline-block text-blue-600 hover:underline text-sm">
              Erste Vorlage anlegen
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <Link
                key={t.id}
                href={`/stammdaten/meilenstein-vorlagen/${t.id}`}
                className="block bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-slate-900">{t.name}</h3>
                {t.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>}
                <p className="text-xs text-slate-400 mt-2">{t.items.length} Einträge</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
