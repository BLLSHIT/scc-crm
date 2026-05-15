import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: products, error } = await supabase
    .from('products')
    .select('name, description, sku, category, unit, defaultPriceNet, purchasePriceNet, defaultVatRate, imageUrl, isActive')
    .order('name', { ascending: true })

  if (error) {
    return new NextResponse('Fehler beim Laden der Produkte', { status: 500 })
  }

  const headers = ['name', 'description', 'sku', 'category', 'unit', 'defaultPriceNet', 'purchasePriceNet', 'defaultVatRate', 'imageUrl', 'isActive']
  const rows = (products ?? []).map((p) =>
    headers.map((h) => {
      const val = (p as Record<string, unknown>)[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      // Quote fields that contain commas, quotes, or newlines
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  )

  const csv = [headers.join(','), ...rows].join('\n')
  const filename = `produkte_${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
