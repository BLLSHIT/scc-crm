'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText, Trash2, Map, Image as ImageIcon, FileSignature, Eye } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/format'
import { recordDealAttachment, deleteDealAttachment } from '@/lib/actions/attachments.actions'
import { FilePreviewModal } from '@/components/ui/FilePreviewModal'

interface Attachment {
  id: string
  filename: string
  storagePath: string
  fileSize: number | null
  mimeType: string | null
  category: string
  uploadedByName: string | null
  createdAt: string
}

interface Props {
  dealId: string
  initialAttachments: Attachment[]
}

const CATEGORY_LABEL: Record<string, string> = {
  lageplan: 'Lageplan',
  rendering: 'Rendering',
  po: 'PO / AFP',
  other: 'Sonstiges',
}
const CATEGORY_ICON: Record<string, typeof Map> = {
  lageplan: Map,
  rendering: ImageIcon,
  po: FileSignature,
  other: FileText,
}
const CATEGORY_COLOR: Record<string, string> = {
  lageplan: 'text-emerald-600 bg-emerald-50',
  rendering: 'text-violet-600 bg-violet-50',
  po: 'text-amber-600 bg-amber-50',
  other: 'text-slate-500 bg-slate-50',
}

export function DealAttachmentsCard({ dealId, initialAttachments }: Props) {
  const router = useRouter()
  const [attachments, setAttachments] = useState(initialAttachments)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('other')
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  async function handleUpload(file: File) {
    setError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? ''
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${dealId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}_${safe}`

      const { error: upErr } = await supabase.storage
        .from('deal-attachments')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || `application/${ext}`,
        })
      if (upErr) throw upErr

      const result = await recordDealAttachment({
        dealId,
        filename: file.name,
        storagePath,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        category: category as 'lageplan' | 'rendering' | 'po' | 'other',
      })
      if (result.error) throw new Error(result.error)
      if (result.attachment) {
        setAttachments((prev) => [
          {
            id: result.attachment!.id,
            filename: result.attachment!.filename,
            storagePath: result.attachment!.storagePath,
            fileSize: result.attachment!.fileSize,
            mimeType: result.attachment!.mimeType,
            category: result.attachment!.category,
            uploadedByName: 'Du',
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ])
      }
      router.refresh()
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Upload fehlgeschlagen.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(att: Attachment) {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('deal-attachments')
      .createSignedUrl(att.storagePath, 3600)
    if (error || !data?.signedUrl) {
      setError('Download-URL konnte nicht erstellt werden.')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  function handleDelete(att: Attachment) {
    if (!confirm(`Datei „${att.filename}" wirklich löschen?`)) return
    startTransition(async () => {
      const result = await deleteDealAttachment(att.id)
      if (result.error) {
        setError(result.error)
        return
      }
      setAttachments((prev) => prev.filter((a) => a.id !== att.id))
      router.refresh()
    })
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const previewFiles = attachments.map((a) => ({
    id: a.id,
    filename: a.filename,
    mimeType: a.mimeType,
    storagePath: a.storagePath,
    bucket: 'deal-attachments',
  }))

  return (
    <>
    {previewIndex !== null && (
      <FilePreviewModal
        files={previewFiles}
        initialIndex={previewIndex}
        onClose={() => setPreviewIndex(null)}
      />
    )}
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Dateien ({attachments.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 mb-3">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-xs border border-input bg-background px-2 py-1.5 rounded-md"
            disabled={uploading}
          >
            <option value="lageplan">Lageplan</option>
            <option value="rendering">Rendering</option>
            <option value="po">PO / AFP</option>
            <option value="other">Sonstiges</option>
          </select>
          <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors ${
            uploading ? 'bg-slate-200 text-slate-400 cursor-wait' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}>
            <Upload className="w-3.5 h-3.5" />
            {uploading ? 'Hochladen…' : 'Datei auswählen'}
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleUpload(f)
                e.currentTarget.value = ''
              }}
              disabled={uploading}
            />
          </label>
        </div>

        {attachments.length === 0 ? (
          <p className="text-sm text-slate-400">Noch keine Dateien.</p>
        ) : (
          <ul className="divide-y -mx-3">
            {attachments.map((a) => {
              const Icon = CATEGORY_ICON[a.category] ?? FileText
              const color = CATEGORY_COLOR[a.category] ?? CATEGORY_COLOR.other
              return (
                <li key={a.id} className="flex items-start gap-2 px-3 py-2 hover:bg-slate-50">
                  <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewIndex(attachments.indexOf(a))}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-sm font-medium text-slate-900 truncate hover:text-blue-600">
                      {a.filename}
                    </p>
                    <p className="text-xs text-slate-500">
                      {CATEGORY_LABEL[a.category] ?? a.category}
                      {a.fileSize ? ` · ${formatSize(a.fileSize)}` : ''}
                      {a.uploadedByName ? ` · ${a.uploadedByName}` : ''}
                      {' · '}{formatDateTime(a.createdAt)}
                    </p>
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewIndex(attachments.indexOf(a))}
                    className="text-slate-400 hover:text-slate-700"
                    title="Vorschau"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(a)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
    </>
  )
}
