/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTeamMembers } from '@/lib/db/team-members'
import { Header } from '@/components/layout/Header'
import { buttonVariants } from '@/components/ui/button'
import { Plus, Mail, Phone } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function TeamsPage() {
  let profile: Profile | null = null
  let members: any[] = []

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    members = await getTeamMembers()
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Team laden" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`SCC-Team (${members.length})`}
        profile={profile}
        actions={
          <Link href="/teams/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="w-4 h-4 mr-2" />
            Mitglied
          </Link>
        }
      />
      <main className="p-6">
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Position</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Kontakt</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Erstellt</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    Noch keine Team-Mitglieder.{' '}
                    <Link href="/teams/new" className="text-blue-600 hover:underline">
                      Erstes Mitglied anlegen
                    </Link>
                  </td>
                </tr>
              )}
              {members.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/teams/${m.id}/edit`}
                      className="font-medium text-slate-900 hover:text-blue-600"
                    >
                      {m.firstName} {m.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.position ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 text-xs text-slate-600">
                      <a
                        href={`mailto:${m.email}`}
                        className="flex items-center gap-1 hover:text-blue-600"
                      >
                        <Mail className="w-3 h-3" />
                        {m.email}
                      </a>
                      {m.mobile && (
                        <a
                          href={`tel:${m.mobile}`}
                          className="flex items-center gap-1 hover:text-blue-600"
                        >
                          <Phone className="w-3 h-3" />
                          {m.mobile}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {m.isActive ? (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">
                        Aktiv
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500">
                        Inaktiv
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
