'use client'
import { useState } from 'react'
import { Download } from 'lucide-react'
import { HandoverProtocolDrawer } from '@/components/projects/HandoverProtocolDrawer'

interface Props {
  projectId: string
  projectName: string
}

export function HandoverProtocolTrigger({ projectId, projectName }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors"
      >
        <Download className="w-4 h-4" />
        Übergabe-PDF
      </button>
      <HandoverProtocolDrawer
        open={open}
        onClose={() => setOpen(false)}
        projectId={projectId}
        projectName={projectName}
      />
    </>
  )
}
