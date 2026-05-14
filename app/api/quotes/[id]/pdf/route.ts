import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getQuoteById } from '@/lib/db/quotes'
import { getSettings } from '@/lib/db/settings'
import { QuotePDFDocument } from '@/lib/pdf/QuotePDFDocument'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  // Auth-Check
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const [quote, settings] = await Promise.all([getQuoteById(id), getSettings()])

    if (!quote) {
      return new NextResponse('Not found', { status: 404 })
    }

    const url = new URL(request.url)
    const inline = url.searchParams.get('inline') === '1'

    // PDF rendern
    const element = createElement(QuotePDFDocument, { quote, settings })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any)

    const filename = `${quote.quoteNumber ?? 'Angebot'}.pdf`
    // Buffer → Uint8Array für BodyInit-Typ
    const body = new Uint8Array(buffer)
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[GET /api/quotes/:id/pdf] error:', err)
    return new NextResponse(
      err instanceof Error ? err.message : 'PDF-Erstellung fehlgeschlagen',
      { status: 500 }
    )
  }
}
