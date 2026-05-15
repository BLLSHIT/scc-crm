'use client'
import { useState } from 'react'
import { AcceptanceDesktopOverview } from '@/components/acceptance/AcceptanceDesktopOverview'
import { AcceptancePhasesTabs } from '@/components/acceptance/AcceptancePhasesTabs'
import type { AcceptanceProtocol } from '@/lib/db/acceptance-protocol'

interface TeamOption { id: string; firstName: string; lastName: string }
interface BuildTeamOption { id: string; name: string }

interface Props {
  protocol: AcceptanceProtocol
  projectId: string
  teamMembers: TeamOption[]
  buildTeams: BuildTeamOption[]
}

export function ProtocolModeWrapper({ protocol, projectId, teamMembers, buildTeams }: Props) {
  const [tabletMode, setTabletMode] = useState(false)

  if (tabletMode) {
    return (
      <div className="fixed inset-0 z-40 bg-slate-100">
        <div className="absolute top-3 left-3 z-50">
          <button
            onClick={() => setTabletMode(false)}
            className="bg-white text-slate-700 text-xs px-3 py-1.5 rounded-full shadow border border-slate-200"
          >
            ← Desktop
          </button>
        </div>
        <AcceptancePhasesTabs
          protocol={protocol}
          projectId={projectId}
          teamMembers={teamMembers}
          buildTeams={buildTeams}
        />
      </div>
    )
  }

  return (
    <AcceptanceDesktopOverview
      protocol={protocol}
      projectId={projectId}
      onTabletMode={() => setTabletMode(true)}
    />
  )
}
