import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateProtocol } from '@/lib/db/acceptance-protocol'
import { getActiveBuildTeamOptions } from '@/lib/db/build-teams'
import { ProtocolModeWrapper } from '@/components/acceptance/ProtocolModeWrapper'

export default async function ProtocolPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: projectId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [protocol, tmRes, buildTeams] = await Promise.all([
    getOrCreateProtocol(projectId),
    supabase.from('team_members').select('id, firstName, lastName').eq('isActive', true).order('lastName'),
    getActiveBuildTeamOptions(),
  ])

  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <Link
          href={`/projects/${projectId}`}
          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" /> Zurück zum Projekt
        </Link>
      </div>
      <main className="p-6 max-w-3xl mx-auto">
        <ProtocolModeWrapper
          protocol={protocol}
          projectId={projectId}
          teamMembers={tmRes.data ?? []}
          buildTeams={buildTeams}
        />
      </main>
    </div>
  )
}
