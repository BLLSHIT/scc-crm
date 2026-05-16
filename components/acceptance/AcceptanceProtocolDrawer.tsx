'use client'
import { useEffect } from 'react'
import { X, FileText } from 'lucide-react'
import { ProtocolModeWrapper } from '@/components/acceptance/ProtocolModeWrapper'
import type { AcceptanceProtocol } from '@/lib/db/acceptance-protocol'

interface TeamOption { id: string; firstName: string; lastName: string }
interface BuildTeamOption { id: string; name: string }

interface Props {
  open: boolean
  onClose: () => void
  protocol: AcceptanceProtocol
  projectId: string
  projectName: string
  teamMembers: TeamOption[]
  buildTeams: BuildTeamOption[]
  currentUserId?: string
}

export function AcceptanceProtocolDrawer({
  open, onClose, protocol, projectId, projectName, teamMembers, buildTeams, currentUserId,
}: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside className="relative ml-auto h-full w-full max-w-3xl bg-white shadow-2xl flex flex-col">
        <header className="border-b px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-baseline gap-3 min-w-0">
            <h2 className="font-semibold text-slate-900">Abnahmeprotokoll</h2>
            <span className="text-xs text-slate-500 truncate">{projectName}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/projects/${projectId}/acceptance-pdf`}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              PDF
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded hover:bg-slate-100 text-slate-500"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <ProtocolModeWrapper
            protocol={protocol}
            projectId={projectId}
            teamMembers={teamMembers}
            buildTeams={buildTeams}
            currentUserId={currentUserId}
          />
        </div>
      </aside>
    </div>
  )
}
