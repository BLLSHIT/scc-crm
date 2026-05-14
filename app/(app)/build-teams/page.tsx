/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBuildTeams } from '@/lib/db/build-teams'
import { Header } from '@/components/layout/Header'
import { buttonVariants } from '@/components/ui/button'
import { Plus, Users } from 'lucide-react'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function BuildTeamsPage() {
  let profile: Profile | null = null
  let teams: any[] = []
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    teams = await getBuildTeams()
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Bautrupp laden" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`Bautrupp (${teams.length})`}
        profile={profile}
        actions={
          <Link href="/build-teams/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="w-4 h-4 mr-2" />Bauteam
          </Link>
        }
      />
      <main className="p-6 space-y-4">
        <p className="text-sm text-slate-500 max-w-2xl">
          Bauteams werden Projekten zugewiesen. Pro Team können mehrere Bauarbeiter
          (auch externe Subunternehmer) erfasst werden. Bei Doppelbelegung zeigt das
          Projekt-Formular eine Warnung.
        </p>

        {teams.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-slate-400 max-w-2xl">
            Noch kein Bauteam.{' '}
            <Link href="/build-teams/new" className="text-blue-600 hover:underline">
              Erstes Bauteam anlegen
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((t: any) => {
              const activeMembers = (t.members ?? []).filter((m: any) => m.isActive)
              return (
                <Link key={t.id} href={`/build-teams/${t.id}`}
                  className="block bg-white rounded-xl border hover:border-blue-300 hover:shadow-sm transition p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">{t.name}</h3>
                    {t.isActive ? (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">Aktiv</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500">Inaktiv</span>
                    )}
                  </div>
                  {t.description && <p className="text-sm text-slate-500 mb-3">{t.description}</p>}
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">{activeMembers.length}</span>
                    <span className="text-slate-400">Mitglieder</span>
                    <span className="text-slate-300 mx-1">·</span>
                    <span className="text-xs text-slate-500">
                      max {t.maxConcurrentProjects} parallele Projekte
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
