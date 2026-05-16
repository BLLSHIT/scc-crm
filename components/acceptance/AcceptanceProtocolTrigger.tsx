'use client'
import { useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { AcceptanceProtocolDrawer } from '@/components/acceptance/AcceptanceProtocolDrawer'
import type { AcceptanceProtocol } from '@/lib/db/acceptance-protocol'

interface TeamOption { id: string; firstName: string; lastName: string }
interface BuildTeamOption { id: string; name: string }

interface Props {
  protocol: AcceptanceProtocol
  projectId: string
  projectName: string
  teamMembers: TeamOption[]
  buildTeams: BuildTeamOption[]
  currentUserId?: string
}

export function AcceptanceProtocolTrigger({
  protocol, projectId, projectName, teamMembers, buildTeams, currentUserId,
}: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
      >
        <ClipboardCheck className="w-4 h-4" />
        Abnahmeprotokoll
      </button>
      <AcceptanceProtocolDrawer
        open={open}
        onClose={() => setOpen(false)}
        protocol={protocol}
        projectId={projectId}
        projectName={projectName}
        teamMembers={teamMembers}
        buildTeams={buildTeams}
        currentUserId={currentUserId}
      />
    </>
  )
}
