'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleWorkflowRule } from '@/lib/actions/workflow-rules.actions'

interface WorkflowToggleProps {
  id: string
  isEnabled: boolean
}

export function WorkflowToggle({ id, isEnabled }: WorkflowToggleProps) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(isEnabled)
  const [, startTransition] = useTransition()

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    startTransition(async () => {
      await toggleWorkflowRule(id, next)
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      role="switch"
      aria-checked={enabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        enabled ? 'bg-blue-600' : 'bg-slate-200'
      }`}
      title={enabled ? 'Aktiv – klicken zum Deaktivieren' : 'Inaktiv – klicken zum Aktivieren'}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
