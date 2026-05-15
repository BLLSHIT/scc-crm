// app/api/projects/[id]/acceptance-pdf/route.ts
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateProtocol } from '@/lib/db/acceptance-protocol'
import { AcceptancePDFDocument } from '@/lib/pdf/AcceptancePDFDocument'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return new NextResponse('Unauthorized', { status: 401 })

  try {
    const [protocol, projectRes, settingsRes] = await Promise.all([
      getOrCreateProtocol(projectId),
      supabase.from('projects').select('name').eq('id', projectId).single(),
      supabase.from('settings').select('*').eq('id', 'singleton').single(),
    ])

    const projectName = projectRes.data?.name ?? projectId

    // Collect all photo storagePaths
    const allPhotos = protocol.phases.flatMap((ph) => ph.items.flatMap((i) => i.photos))
    const photoUrls: Record<string, string> = {}
    await Promise.all(
      allPhotos.map(async (photo) => {
        const { data } = await supabase.storage
          .from('project-attachments')
          .createSignedUrl(photo.storagePath, 300)
        if (data?.signedUrl) photoUrls[photo.id] = data.signedUrl
      })
    )

    const generatedAt = new Date().toLocaleDateString('de-DE')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      createElement(AcceptancePDFDocument, {
        protocol: { ...protocol, projectName },
        settings: settingsRes.data,
        photoUrls,
        generatedAt,
      }) as any
    )

    const safe = projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const filename = `abnahme_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[acceptance-pdf]', err)
    return new NextResponse('PDF-Fehler', { status: 500 })
  }
}
