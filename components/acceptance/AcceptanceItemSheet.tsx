// components/acceptance/AcceptanceItemSheet.tsx
'use client'
import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Trash2, Camera, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateItem, deleteItem, recordItemPhoto, deleteItemPhoto } from '@/lib/actions/acceptance-protocol.actions'
import { createClient } from '@/lib/supabase/client'
import type { AcceptanceItem } from '@/lib/db/acceptance-protocol'

interface TeamOption { id: string; firstName: string; lastName: string }
interface BuildTeamOption { id: string; name: string }

interface Props {
  item: AcceptanceItem
  projectId: string
  teamMembers: TeamOption[]
  buildTeams: BuildTeamOption[]
  onClose: () => void
}

export function AcceptanceItemSheet({ item, projectId, teamMembers, buildTeams, onClose }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [status, setStatus] = useState(item.status)
  const [priority, setPriority] = useState<string>(item.priority ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const [assigneeId, setAssigneeId] = useState(item.assigneeId ?? '')
  const [buildTeamId, setBuildTeamId] = useState(item.buildTeamId ?? '')
  const [uploading, setUploading] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [localPhotos, setLocalPhotos] = useState<Array<{
    id: string
    storagePath: string
    filename: string
    signedUrl: string
  }>>([])
  const [error, setError] = useState<string | null>(null)

  // Load signed URLs for existing photos
  useEffect(() => {
    if (item.photos.length === 0) return
    const supabase = createClient()
    Promise.all(
      item.photos.map(async (photo) => {
        const { data } = await supabase.storage
          .from('project-attachments')
          .createSignedUrl(photo.storagePath, 3600)
        return [photo.id, data?.signedUrl ?? null] as [string, string | null]
      })
    ).then((results) => {
      const urls: Record<string, string> = {}
      results.forEach(([id, url]) => { if (url) urls[id] = url })
      setPhotoUrls(urls)
    })
  }, [item.photos])

  function handleSave() {
    startTransition(async () => {
      const result = await updateItem(item.id, projectId, {
        status: status as AcceptanceItem['status'],
        priority: (status === 'defect' && priority) ? priority as AcceptanceItem['priority'] : null,
        notes: notes || null,
        assigneeId: assigneeId || null,
        buildTeamId: buildTeamId || null,
      })
      if (result.error) { setError(result.error); return }
      router.refresh()
      onClose()
    })
  }

  function handleDelete() {
    if (!confirm(`"${item.title}" wirklich löschen?`)) return
    startTransition(async () => {
      await deleteItem(item.id, projectId)
      router.refresh()
      onClose()
    })
  }

  async function handlePhotoUpload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `acceptance/${projectId}/${item.id}/${Date.now()}_${safe}`

      const { error: upErr } = await supabase.storage
        .from('project-attachments')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false, contentType: file.type || `image/${ext}` })
      if (upErr) throw upErr

      const result = await recordItemPhoto(item.id, projectId, storagePath, file.name)
      if (result.error) throw new Error(result.error)

      const { data: signedData } = await supabase.storage
        .from('project-attachments')
        .createSignedUrl(storagePath, 3600)

      if (signedData?.signedUrl) {
        setLocalPhotos(prev => [...prev, {
          id: `local-${Date.now()}`,
          storagePath,
          filename: file.name,
          signedUrl: signedData.signedUrl,
        }])
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeletePhoto(photoId: string, storagePath: string) {
    if (!confirm('Foto löschen?')) return
    startTransition(async () => {
      await deleteItemPhoto(photoId, storagePath, projectId)
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ touchAction: 'none' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h2 className="font-semibold text-slate-900 text-base truncate flex-1">{item.title}</h2>
        <button onClick={onClose} className="ml-3 p-1.5 rounded-full hover:bg-slate-200">
          <X className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Status */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Status</p>
          <div className="flex gap-2">
            {(['not_checked', 'ok', 'defect'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); if (s !== 'defect') setPriority('') }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  status === s
                    ? s === 'ok'    ? 'bg-green-500 text-white border-green-500'
                    : s === 'defect' ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {s === 'ok' ? 'OK' : s === 'defect' ? 'Mangel' : 'Offen'}
              </button>
            ))}
          </div>
        </div>

        {/* Priority — only when defect */}
        {status === 'defect' && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Priorität</p>
            <div className="flex gap-2">
              {(['low', 'medium', 'critical'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    priority === p
                      ? p === 'critical' ? 'bg-red-500 text-white border-red-500'
                      : p === 'medium'   ? 'bg-orange-400 text-white border-orange-400'
                      : 'bg-yellow-400 text-slate-900 border-yellow-400'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {p === 'low' ? 'Leicht' : p === 'medium' ? 'Mittel' : 'Kritisch'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Notiz</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Beschreibung des Befunds..."
          />
        </div>

        {/* Assignee */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Teammitglied</p>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">—</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Bautrupp</p>
            <select
              value={buildTeamId}
              onChange={(e) => setBuildTeamId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">—</option>
              {buildTeams.map((bt) => (
                <option key={bt.id} value={bt.id}>{bt.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Photos */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Fotos</p>
          <div className="flex flex-wrap gap-2">
            {item.photos.map((photo) => (
              <div key={photo.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                {photoUrls[photo.id] ? (
                  <img src={photoUrls[photo.id]} alt={photo.filename} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <button
                  onClick={() => handleDeletePhoto(photo.id, photo.storagePath)}
                  className="absolute top-0.5 right-0.5 bg-red-500 rounded-full p-0.5"
                >
                  <XCircle className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}

            {localPhotos.map((photo) => (
              <div key={photo.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 ring-2 ring-blue-300">
                <img src={photo.signedUrl} alt={photo.filename} className="w-full h-full object-cover" />
              </div>
            ))}

            {/* Kamera-Button */}
            <label className={`w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <Camera className="w-5 h-5 text-slate-400" />
              <span className="text-xs text-slate-400 mt-1">Kamera</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handlePhotoUpload(f)
                  e.currentTarget.value = ''
                }}
              />
            </label>

            {/* Datei-Bibliothek-Button */}
            <label className={`w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
              <span className="text-xs text-slate-400 mt-1">Bibliothek</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handlePhotoUpload(f)
                  e.currentTarget.value = ''
                }}
              />
            </label>

            {uploading && (
              <div className="w-20 h-20 rounded-lg border border-slate-200 flex items-center justify-center bg-slate-50">
                <span className="text-xs text-slate-400">...</span>
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {/* Footer actions */}
      <div className="border-t border-slate-200 p-4 flex gap-3 bg-white">
        <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500">
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button onClick={handleSave} className="flex-1">Speichern</Button>
      </div>
    </div>
  )
}
