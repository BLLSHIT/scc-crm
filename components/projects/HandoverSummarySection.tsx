import { Download } from 'lucide-react'

interface Props {
  projectId: string
  milestones: { completedAt?: string | null }[]
  punchItems: { isDone: boolean }[]
  materialItems: { id: string }[]
}

export function HandoverSummarySection({ projectId, milestones, punchItems, materialItems }: Props) {
  const milestoneDone = milestones.filter((m) => m.completedAt).length
  const milestoneTotal = milestones.length
  const openPunch = punchItems.filter((p) => !p.isDone).length
  const materialCount = materialItems.length

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Übergabeprotokoll</h3>
        <a
          href={`/api/projects/${projectId}/handover-pdf`}
          download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition-colors text-slate-700"
        >
          <Download className="w-3.5 h-3.5" />
          PDF herunterladen
        </a>
      </div>
      <div className="px-4 py-3 flex gap-6">
        <div className="text-center">
          <div className={`text-xl font-bold ${milestoneDone === milestoneTotal && milestoneTotal > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
            {milestoneDone}/{milestoneTotal}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Meilensteine</div>
        </div>
        <div className="w-px bg-slate-200 self-stretch" />
        <div className="text-center">
          <div className={`text-xl font-bold ${openPunch === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {openPunch}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Mängel offen</div>
        </div>
        <div className="w-px bg-slate-200 self-stretch" />
        <div className="text-center">
          <div className="text-xl font-bold text-slate-900">{materialCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">Materialpos.</div>
        </div>
      </div>
    </div>
  )
}
