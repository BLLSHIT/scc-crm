'use client'
import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Download, Loader2, FileText } from 'lucide-react'
import { getSignedAttachmentUrl } from '@/lib/actions/attachments.actions'

export interface PreviewFile {
  id: string
  filename: string
  mimeType: string | null
  storagePath: string
  bucket: string
}

interface Props {
  files: PreviewFile[]
  initialIndex?: number
  onClose: () => void
}

export function FilePreviewModal({ files, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const file = files[index]
  const isImage = !!(file?.mimeType?.startsWith('image/'))
  const isPdf = file?.mimeType === 'application/pdf'

  const loadUrl = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setSignedUrl(null)
    const url = await getSignedAttachmentUrl(file.storagePath, file.bucket)
    if (url) {
      setSignedUrl(url)
    } else {
      setError('Vorschau nicht verfügbar.')
    }
    setLoading(false)
  }, [file?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadUrl()
  }, [loadUrl])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(files.length - 1, i + 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [files.length, onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
          <p className="text-sm font-medium truncate flex-1 mr-4">{file?.filename}</p>
          <div className="flex items-center gap-1">
            {signedUrl && (
              <a
                href={signedUrl}
                download={file?.filename}
                className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                title="Herunterladen"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-50 p-4 min-h-0">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-xs">Lade Vorschau…</p>
            </div>
          )}
          {!loading && error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          {!loading && !error && signedUrl && isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signedUrl}
              alt={file?.filename}
              className="max-w-full max-h-full object-contain rounded shadow"
            />
          )}
          {!loading && !error && signedUrl && isPdf && (
            <iframe
              src={signedUrl}
              className="w-full min-h-[65vh] rounded border"
              title={file?.filename}
            />
          )}
          {!loading && !error && signedUrl && !isImage && !isPdf && (
            <div className="text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-slate-500 text-sm">Keine Vorschau für diesen Dateityp.</p>
              <a
                href={signedUrl}
                download={file?.filename}
                className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Datei herunterladen
              </a>
            </div>
          )}
        </div>

        {/* Navigation */}
        {files.length > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t flex-shrink-0">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Zurück
            </button>
            <p className="text-xs text-slate-400">{index + 1} / {files.length}</p>
            <button
              onClick={() => setIndex((i) => Math.min(files.length - 1, i + 1))}
              disabled={index === files.length - 1}
              className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Weiter
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
