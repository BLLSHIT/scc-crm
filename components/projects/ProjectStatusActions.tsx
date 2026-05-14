'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateProjectStatus } from '@/lib/actions/projects.actions'
import type { ProjectStatus } from '@/lib/db/projects'

const OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'planning',     label: 'Planung' },
  { value: 'ordered',      label: 'Material bestellt' },
  { value: 'installation', label: 'In Installation' },
  { value: 'completed',    label: 'Abgeschlossen' },
  { value: 'on_hold',      label: 'Pausiert' },
  { value: 'cancelled',    label: 'Storniert' },
]

export function ProjectStatusActions({ projectId, currentStatus }: { projectId: string; currentStatus: ProjectStatus }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState<ProjectStatus>(currentStatus)
  const [error, setError] = useState<string | null>(null)

  function onChange(next: ProjectStatus) {
    if (next === value) return
    setError(null); setValue(next)
    startTransition(async () => {
      const result = await updateProjectStatus(projectId, next)
      if (result?.error) {
        setError(result.error._form?.[0] ?? 'Statusänderung fehlgeschlagen.')
        setValue(currentStatus)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">Status</label>
        <select value={value} onChange={(e) => onChange(e.target.value as ProjectStatus)} disabled={pending}
          className="border border-input bg-background px-3 py-1.5 text-sm rounded-md min-w-[170px]">
          {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
