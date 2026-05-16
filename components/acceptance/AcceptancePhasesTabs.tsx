// components/acceptance/AcceptancePhasesTabs.tsx
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, CheckCircle2, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AcceptanceItemCard } from '@/components/acceptance/AcceptanceItemCard'
import { AcceptanceItemSheet } from '@/components/acceptance/AcceptanceItemSheet'
import { SignatureModal } from '@/components/acceptance/SignatureModal'
import { addItem, addPhase, completePhase } from '@/lib/actions/acceptance-protocol.actions'
import type { AcceptanceProtocol, AcceptancePhase, AcceptanceItem } from '@/lib/db/acceptance-protocol'

interface TeamOption { id: string; firstName: string; lastName: string }
interface BuildTeamOption { id: string; name: string }

interface Props {
  protocol: AcceptanceProtocol
  projectId: string
  teamMembers: TeamOption[]
  buildTeams: BuildTeamOption[]
  currentUserId?: string
  initialPhaseId?: string
}

export function AcceptancePhasesTabs({ protocol, projectId, teamMembers, buildTeams, currentUserId, initialPhaseId }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [activePhaseId, setActivePhaseId] = useState<string>(
    initialPhaseId ?? protocol.phases[0]?.id ?? ''
  )
  const [editingItem, setEditingItem] = useState<AcceptanceItem | null>(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [showSignature, setShowSignature] = useState(false)
  const [showAddPhase, setShowAddPhase] = useState(false)
  const [newPhaseName, setNewPhaseName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const activePhase: AcceptancePhase | undefined = protocol.phases.find((p) => p.id === activePhaseId)

  // A phase is locked if any previous phase is not completed
  function isLocked(phase: AcceptancePhase): boolean {
    const idx = protocol.phases.findIndex((p) => p.id === phase.id)
    if (idx === 0) return false
    return protocol.phases.slice(0, idx).some((p) => !p.completedAt)
  }

  function handleAddItem() {
    if (!newItemTitle.trim() || !activePhaseId) return
    setError(null)
    startTransition(async () => {
      const result = await addItem(activePhaseId, projectId, newItemTitle)
      if (result.error) { setError(result.error); return }
      setNewItemTitle('')
      setShowAddItem(false)
      router.refresh()
    })
  }

  function handleAddPhase() {
    if (!newPhaseName.trim()) return
    startTransition(async () => {
      const result = await addPhase(protocol.id, projectId, newPhaseName)
      if (result.error) { setError(result.error); return }
      setNewPhaseName('')
      setShowAddPhase(false)
      router.refresh()
    })
  }

  function handleCompletePhase(signatureDataUrl: string | null) {
    setShowSignature(false)
    if (!activePhaseId) return
    startTransition(async () => {
      const result = await completePhase(activePhaseId, projectId, signatureDataUrl, currentUserId ?? null)
      if (result.error) { setError(result.error); return }
      // Move to next incomplete phase
      const nextPhase = protocol.phases.find((p) => !p.completedAt && p.id !== activePhaseId)
      if (nextPhase) setActivePhaseId(nextPhase.id)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100" style={{ touchAction: 'pan-y' }}>
      {/* Top bar */}
      <div className="bg-[#036147] text-white px-4 pt-3 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-bold text-base truncate">{activePhase?.name ?? 'Protokoll'}</h1>
          <span className="text-xs text-emerald-200 ml-2">{activePhase ? `${activePhase.items.filter(i => i.status !== 'not_checked').length}/${activePhase.items.length}` : ''}</span>
        </div>
        {/* Phase tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-none -mx-1 px-1">
          {protocol.phases.map((phase) => {
            const locked = isLocked(phase)
            const active = phase.id === activePhaseId
            return (
              <button
                key={phase.id}
                onClick={() => !locked && setActivePhaseId(phase.id)}
                disabled={locked}
                className={`flex-shrink-0 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                  active   ? 'bg-white text-[#036147]'
                  : locked ? 'text-emerald-900 cursor-not-allowed opacity-50'
                  : phase.completedAt ? 'text-emerald-200 hover:text-white'
                  : 'text-emerald-200 hover:text-white'
                }`}
              >
                {phase.completedAt ? <CheckCircle2 className="w-3 h-3" /> : locked ? <Lock className="w-3 h-3" /> : null}
                {phase.name}
              </button>
            )
          })}
          <button
            onClick={() => setShowAddPhase(true)}
            className="flex-shrink-0 px-2 py-2 text-xs text-emerald-300 hover:text-white"
          >
            +
          </button>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!activePhase && (
          <p className="text-sm text-slate-400 text-center py-12">Keine Phase ausgewählt.</p>
        )}
        {activePhase?.completedAt && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 text-center">
            ✅ Phase abgeschlossen am {new Date(activePhase.completedAt).toLocaleDateString('de-DE')}
          </div>
        )}
        <div className={activePhase?.completedAt ? 'opacity-60 pointer-events-none' : ''}>
          {activePhase?.items.map((item) => (
            <AcceptanceItemCard
              key={item.id}
              item={item}
              onEdit={(i) => setEditingItem(i)}
            />
          ))}
        </div>
        {activePhase?.items.length === 0 && !activePhase.completedAt && (
          <p className="text-sm text-slate-400 text-center py-8">Noch keine Prüfpunkte. Füge einen hinzu.</p>
        )}
        {error && <p className="text-xs text-red-600 text-center">{error}</p>}
      </div>

      {/* Bottom action bar */}
      {activePhase && !activePhase.completedAt && (
        <div className="flex-shrink-0 bg-white border-t border-slate-200 p-3">
          {showAddItem ? (
            <div className="flex gap-2">
              <Input
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Prüfpunkt Titel"
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                autoFocus
                className="text-sm"
              />
              <button
                onClick={handleAddItem}
                className="bg-[#036147] text-white px-4 rounded-lg text-sm font-medium"
              >
                OK
              </button>
              <button
                onClick={() => { setShowAddItem(false); setNewItemTitle('') }}
                className="px-3 text-slate-500 text-sm"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddItem(true)}
                className="flex-1 py-3 rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-500 font-medium flex items-center justify-center gap-2 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
              >
                <Plus className="w-4 h-4" /> Punkt hinzufügen
              </button>
              <button
                onClick={() => setShowSignature(true)}
                className="flex-1 py-3 rounded-xl bg-white text-[#036147] border border-[#036147] text-sm font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Phase abschliessen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add phase form */}
      {showAddPhase && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-white border-t border-slate-200 p-4 flex gap-2">
          <Input
            value={newPhaseName}
            onChange={(e) => setNewPhaseName(e.target.value)}
            placeholder="Neue Phase benennen..."
            autoFocus
            className="text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleAddPhase()}
          />
          <button onClick={handleAddPhase} className="bg-[#036147] text-white px-4 rounded-lg text-sm font-medium">OK</button>
          <button onClick={() => setShowAddPhase(false)} className="px-3 text-slate-500 text-sm">✕</button>
        </div>
      )}

      {/* Item Sheet */}
      {editingItem && (
        <AcceptanceItemSheet
          item={editingItem}
          projectId={projectId}
          teamMembers={teamMembers}
          buildTeams={buildTeams}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Signature Modal */}
      {showSignature && (
        <SignatureModal
          onSave={handleCompletePhase}
          onClose={() => setShowSignature(false)}
        />
      )}
    </div>
  )
}
