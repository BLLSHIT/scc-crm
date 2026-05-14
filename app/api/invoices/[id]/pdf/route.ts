import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getInvoiceById } from '@/lib/db/invoices'
import { getSettings } from '@/lib/db/settings'
import { InvoicePDFDocument } from '@/lib/pdf/InvoicePDFDocument'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const [invoice, settings] = await Promise.all([getInvoiceById(id), getSettings()])
    if (!invoice) return new NextResponse('Not found', { status: 404 })

    const url = new URL(request.url)
    const inline = url.searchParams.get('inline') === '1'

    const element = createElement(InvoicePDFDocument, { invoice, settings })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any)

    const filename = `${invoice.invoiceNumber ?? 'Rechnung'}.pdf`
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
    console.error('[GET /api/invoices/:id/pdf] error:', err)
    return new NextResponse(
      err instanceof Error ? err.message : 'PDF-Erstellung fehlgeschlagen',
      { status: 500 }
    )
  }
}
