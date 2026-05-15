'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FilePreviewModal } from '@/components/ui/FilePreviewModal'
import { Camera, ZoomIn } from 'lucide-react'
import { getSignedAttachmentUrl } from '@/lib/actions/attachments.actions'

interface PhotoAttachment {
  id: string
  filename: string
  storagePath: string
  mimeType: string
  category?: string | null
  uploadedByName?: string | null
  createdAt: string
}

interface Props {
  photos: PhotoAttachment[]
  bucket?: string
}

export function ProjectPhotoGallery({ photos, bucket = 'project-attachments' }: Props) {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  useEffect(() => {
    if (photos.length === 0) return
    let cancelled = false
    async function loadUrls() {
      const entries = await Promise.all(
        photos.map(async (p) => {
          const url = await getSignedAttachmentUrl(p.storagePath, bucket)
          return [p.id, url ?? ''] as [string, string]
        })
      )
      if (!cancelled) {
        setSignedUrls(Object.fromEntries(entries.filter(([, url]) => url)))
      }
    }
    loadUrls()
    return () => { cancelled = true }
  }, [photos, bucket])

  if (photos.length === 0) return null

  const previewFiles = photos.map((p) => ({
    id: p.id,
    filename: p.filename,
    storagePath: p.storagePath,
    mimeType: p.mimeType,
    bucket,
  }))

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="w-4 h-4 text-slate-400" />
            Fotos ({photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, idx) => {
              const url = signedUrls[photo.id]
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setPreviewIndex(idx)}
                  className="relative aspect-square rounded-md overflow-hidden border bg-slate-100 hover:ring-2 hover:ring-blue-500 group"
                  title={photo.filename}
                >
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={photo.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="w-6 h-6 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {previewIndex !== null && (
        <FilePreviewModal
          files={previewFiles}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </>
  )
}
