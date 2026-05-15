/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Pencil, Trash2, Repeat, FileUp, FileX, MessageSquare } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/format'
import { NoteDeleteButton } from './NoteDeleteButton'

const ICON: Record<string, any> = {
  created:        Plus,
  updated:        Pencil,
  deleted:        Trash2,
  status_changed: Repeat,
  file_uploaded:  FileUp,
  file_deleted:   FileX,
  note_added:     MessageSquare,
}
const COLOR: Record<string, string> = {
  created:        'text-emerald-600 bg-emerald-50',
  updated:        'text-blue-600 bg-blue-50',
  deleted:        'text-red-600 bg-red-50',
  status_changed: 'text-violet-600 bg-violet-50',
  file_uploaded:  'text-amber-600 bg-amber-50',
  file_deleted:   'text-slate-500 bg-slate-50',
  note_added:     'text-amber-600 bg-amber-50',
}

interface ActivityTimelineProps {
  items: any[]
  currentUserId?: string
}

export function ActivityTimeline({ items, currentUserId }: ActivityTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aktivitäten</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">Noch keine Aktivitäten.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((a: any) => {
              const Icon  = ICON[a.action]  ?? Pencil
              const color = COLOR[a.action] ?? 'text-slate-500 bg-slate-50'
              const noteId = a.action === 'note_added' ? a.metadata?.noteId : null
              const isOwnNote = noteId && currentUserId && a.metadata?.authorId === currentUserId

              return (
                <li key={a.id} className="flex gap-3 text-sm">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {a.action === 'note_added' ? (
                      <p className="text-slate-700 whitespace-pre-wrap">{a.summary}</p>
                    ) : (
                      <p className="text-slate-900">{a.summary ?? a.action}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-0.5">
                      {a.userName ?? 'System'} · {formatDateTime(a.createdAt)}
                    </p>
                  </div>
                  {isOwnNote && (
                    <NoteDeleteButton
                      noteId={noteId}
                      entityType={a.entityType}
                      entityId={a.entityId}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
