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
  currentUserId?: string
  milestones?: { completedAt?: string | null }[]
  punchItems?: { isDone: boolean }[]
  materialItems?: { id: string }[]
}

export function ProtocolModeWrapper({ protocol, projectId, teamMembers, buildTeams, currentUserId, milestones, punchItems, materialItems }: Props) {
  const [tabletMode, setTabletMode] = useState(false)
  const [initialPhaseId, setInitialPhaseId] = useState<string | undefined>(undefined)

  if (tabletMode) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-100">
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
          currentUserId={currentUserId}
          initialPhaseId={initialPhaseId}
        />
      </div>
    )
  }

  return (
    <AcceptanceDesktopOverview
      protocol={protocol}
      projectId={projectId}
      onTabletMode={(phaseId?: string) => { setInitialPhaseId(phaseId); setTabletMode(true) }}
      milestones={milestones}
      punchItems={punchItems}
      materialItems={materialItems}
    />
  )
}
