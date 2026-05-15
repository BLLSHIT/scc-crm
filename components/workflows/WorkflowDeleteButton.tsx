'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteWorkflowRule } from '@/lib/actions/workflow-rules.actions'

interface WorkflowDeleteButtonProps {
  id: string
}

export function WorkflowDeleteButton({ id }: WorkflowDeleteButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm('Workflow-Regel wirklich löschen?')) return
    startTransition(async () => {
      await deleteWorkflowRule(id)
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
      title="Löschen"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
