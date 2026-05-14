'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FolderKanban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { convertDealToProject } from '@/lib/actions/projects.actions'

export function DealConvertToProject({ dealId, dealTitle }: { dealId: string; dealTitle: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function convert() {
    if (!confirm(`Deal „${dealTitle}" in ein Projekt umwandeln? Standard-Meilensteine werden automatisch angelegt.`)) return
    setError(null)
    startTransition(async () => {
      const result = await convertDealToProject(dealId)
      if (result.error) {
        setError(result.error._form?.[0] ?? Object.values(result.error).flat()[0] ?? 'Fehler')
        return
      }
      if (result.redirectTo) router.push(result.redirectTo)
    })
  }

  return (
    <div className="space-y-1">
      <Button type="button" size="sm" onClick={convert} disabled={pending}>
        <FolderKanban className="w-4 h-4 mr-2" />
        {pending ? 'Wird umgewandelt…' : 'In Projekt umwandeln'}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
