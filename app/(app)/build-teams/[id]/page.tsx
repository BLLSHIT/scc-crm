/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBuildTeamById, getBuildTeamMembers, getActiveProjectsForBuildTeam } from '@/lib/db/build-teams'
import { Header } from '@/components/layout/Header'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Pencil, Mail, Phone, AlertTriangle, FolderKanban, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function BuildTeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let profile: Profile | null = null
  let team: any
  let members: any[] = []
  let activeProjects: any[] = []
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    team = await getBuildTeamById(id)
    members = await getBuildTeamMembers(id)
    activeProjects = await getActiveProjectsForBuildTeam(id)
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Bauteam laden" err={err} />
  }

  if (!team) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">Bauteam nicht gefunden.</div>
      </div>
    )
  }

  const isOverbooked = activeProjects.length > team.maxConcurrentProjects

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={team.name}
        profile={profile}
        actions={
          <Link href={`/build-teams/${id}/edit`}
            className={buttonVariants({ size: 'sm', variant: 'outline' })}>
            <Pencil className="w-4 h-4 mr-2" />Bearbeiten
          </Link>
        }
      />
      <main className="p-6 grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {team.description && (
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-700">{team.description}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Mitglieder ({members.length})</span>
                <Link href={`/build-teams/${id}/members/new`}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" />Mitglied
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {members.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-400">
                  Noch keine Mitglieder.{' '}
                  <Link href={`/build-teams/${id}/members/new`} className="text-blue-600 hover:underline">
                    Erstes Mitglied anlegen
                  </Link>
                </p>
              ) : (
                <ul className="divide-y">
                  {members.map((m: any) => (
                    <li key={m.id}>
                      <Link href={`/build-teams/${id}/members/${m.id}/edit`}
                        className="block px-5 py-3 hover:bg-slate-50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">
                                {m.firstName} {m.lastName}
                              </span>
                              {!m.isActive && (
                                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-500">
                                  inaktiv
                                </span>
                              )}
                              {m.isExternal && (
                                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-700">
                                  extern
                                </span>
                              )}
                            </div>
                            {m.role && <p className="text-xs text-slate-500">{m.role}</p>}
                            {m.companyName && (
                              <p className="text-xs text-slate-500">{m.companyName}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-0.5 text-xs">
                            {m.email && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <Mail className="w-3 h-3" />{m.email}
                              </span>
                            )}
                            {m.phone && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <Phone className="w-3 h-3" />{m.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Aktiv</span>
                <span>{team.isActive ? 'Ja' : 'Nein'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mitglieder gesamt</span>
                <span>{members.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Aktive Mitglieder</span>
                <span>{members.filter((m: any) => m.isActive).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Max. parallele Projekte</span>
                <span className="font-medium">{team.maxConcurrentProjects}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className={`text-slate-500 ${isOverbooked ? 'text-red-600' : ''}`}>
                  Aktuell zugewiesen
                </span>
                <span className={`font-medium ${isOverbooked ? 'text-red-600' : ''}`}>
                  {activeProjects.length}
                </span>
              </div>
              {isOverbooked && (
                <div className="mt-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Überbucht — Team ist auf mehr Projekten als die Kapazität zulässt.</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-slate-400" />
                Aktive Projekte ({activeProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeProjects.length === 0 ? (
                <p className="text-sm text-slate-400">Keine aktiven Projekte zugewiesen.</p>
              ) : (
                <ul className="space-y-2">
                  {activeProjects.map((p: any) => (
                    <li key={p.id}>
                      <Link href={`/projects/${p.id}`}
                        className="block p-2 -mx-2 rounded hover:bg-slate-50">
                        <p className="text-sm font-medium text-blue-600 truncate flex items-center gap-1">
                          {p.name}
                          <ExternalLink className="w-3 h-3" />
                        </p>
                        <p className="text-xs text-slate-500 capitalize">
                          {p.status}
                          {p.startDate && p.plannedEndDate && (
                            <> · {formatDate(p.startDate)} → {formatDate(p.plannedEndDate)}</>
                          )}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {team.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notizen</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-slate-700">{team.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
