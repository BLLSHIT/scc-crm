'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleTaskStatus } from '@/lib/actions/tasks.actions'
import { CheckCircle2, Circle, Clock } from 'lucide-react'

interface TaskStatusToggleProps {
  id: string
  status: 'open' | 'in_progress' | 'done'
}

export function TaskStatusToggle({ id, status }: TaskStatusToggleProps) {
  const router = useRouter()
  const [current, setCurrent] = useState(status)
  const [, startTransition] = useTransition()

  function cycle() {
    const next: typeof current =
      current === 'open' ? 'in_progress' : current === 'in_progress' ? 'done' : 'open'
    setCurrent(next)
    startTransition(async () => {
      await toggleTaskStatus(id, next)
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="p-1 rounded hover:bg-slate-100 transition-colors"
      title={`Status: ${current}`}
    >
      {current === 'done' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
      {current === 'in_progress' && <Clock className="w-5 h-5 text-amber-500" />}
      {current === 'open' && <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500" />}
    </button>
  )
}
