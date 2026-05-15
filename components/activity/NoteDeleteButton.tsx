'use client'
import { useTransition } from 'react'
import { deleteNote } from '@/lib/actions/notes.actions'
import { Trash2 } from 'lucide-react'

interface NoteDeleteButtonProps {
  noteId: string
  entityType: 'deal' | 'contact' | 'company' | 'project'
  entityId: string
}

export function NoteDeleteButton({ noteId, entityType, entityId }: NoteDeleteButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Notiz löschen?')) return
    startTransition(async () => {
      await deleteNote(noteId, entityType, entityId)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="ml-auto p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
      title="Notiz löschen"
    >
      <Trash2 className="w-3 h-3" />
    </button>
  )
}
