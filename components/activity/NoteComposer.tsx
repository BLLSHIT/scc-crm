'use client'
import { useState, useTransition } from 'react'
import { addNote } from '@/lib/actions/notes.actions'
import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'

interface NoteComposerProps {
  entityType: 'deal' | 'contact' | 'company' | 'project'
  entityId: string
}

export function NoteComposer({ entityType, entityId }: NoteComposerProps) {
  const [body, setBody] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    startTransition(async () => {
      await addNote(entityType, entityId, body.trim())
      setBody('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Notiz hinzufügen…"
        rows={3}
        className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <Button
        type="submit"
        size="sm"
        disabled={isPending || !body.trim()}
      >
        <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
        {isPending ? 'Speichern…' : 'Notiz speichern'}
      </Button>
    </form>
  )
}
