'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { productSchema, type ProductInput } from '@/lib/validations/product.schema'

export type ActionResult = {
  error?: Record<string, string[]>
  redirectTo?: string
}

function clean(input: ProductInput) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    sku: input.sku?.trim() || null,
    category: input.category?.trim() || null,
    unit: input.unit?.trim() || 'Stück',
    defaultPriceNet: input.defaultPriceNet,
    purchasePriceNet: input.purchasePriceNet,
    defaultVatRate: input.defaultVatRate,
    imageUrl: input.imageUrl?.trim() || null,
    isActive: input.isActive,
  }
}

export async function createProduct(input: ProductInput): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase.from('products').insert({
    id: randomUUID(),
    ...clean(parsed.data),
    updatedAt: new Date().toISOString(),
  })
  if (error) {
    console.error('[createProduct] error:', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/products')
  return { redirectTo: '/products' }
}

export async function updateProduct(id: string, input: ProductInput): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({ ...clean(parsed.data), updatedAt: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    console.error('[updateProduct] error:', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/products')
  return { redirectTo: '/products' }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) {
    console.error('[deleteProduct] error:', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/products')
  redirect('/products')
}

// ── CSV Import/Export ───────────────────────────────────────────────────────

export interface CsvImportResult {
  imported: number
  updated: number
  skipped: number
  errors: string[]
}

function parseCsvLine(line: string, delimiter = ','): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function detectDelimiter(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  return semicolons > commas ? ';' : ','
}

export async function importProductsCsv(csvText: string): Promise<CsvImportResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { imported: 0, updated: 0, skipped: 0, errors: ['Nicht authentifiziert.'] }
  }

  // BOM entfernen (Excel UTF-8 CSVs beginnen oft mit ﻿)
  const cleaned = csvText.replace(/^﻿/, '')
  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) {
    return { imported: 0, updated: 0, skipped: 0, errors: ['CSV leer oder keine Datenzeilen.'] }
  }

  // Delimiter auto-detektieren: Komma (Standard) oder Semikolon (Excel deutsch)
  const delimiter = detectDelimiter(lines[0])
  const headers = parseCsvLine(lines[0], delimiter).map((h) => h.toLowerCase().trim())
  const colIdx = (name: string) => headers.indexOf(name)
  if (colIdx('name') === -1) {
    return { imported: 0, updated: 0, skipped: 0, errors: ['Pflichtfeld "name" fehlt im CSV-Header.'] }
  }

  let imported = 0, updated = 0, skipped = 0
  const errors: string[] = []

  const { data: existingProducts } = await supabase.from('products').select('id, sku, name')
  const skuMap = new Map<string, string>()
  const nameMap = new Map<string, string>()
  for (const p of (existingProducts ?? [])) {
    if (p.sku) skuMap.set(p.sku.toLowerCase(), p.id)
    nameMap.set(p.name.toLowerCase(), p.id)
  }

  for (let i = 0; i < lines.length - 1; i++) {
    const lineNum = i + 2
    try {
      const cols = parseCsvLine(lines[i + 1], delimiter)
      const get = (name: string) => {
        const idx = colIdx(name)
        return idx >= 0 ? (cols[idx] ?? '').trim() : ''
      }
      const name = get('name')
      if (!name) { errors.push(`Zeile ${lineNum}: Name fehlt.`); skipped++; continue }

      const sku = get('sku')
      const row = {
        name,
        description: get('description') || null,
        sku: sku || null,
        category: get('category') || null,
        unit: get('unit') || 'Stück',
        defaultPriceNet: parseFloat(get('defaultpricenet') || '0') || 0,
        purchasePriceNet: parseFloat(get('purchasepricenet') || '0') || 0,
        defaultVatRate: parseFloat(get('defaultvatrate') || '19') || 19,
        imageUrl: get('imageurl') || null,
        isActive: (get('isactive') || 'true').toLowerCase() !== 'false',
        updatedAt: new Date().toISOString(),
      }

      const existingId = (sku && skuMap.get(sku.toLowerCase())) || nameMap.get(name.toLowerCase())
      if (existingId) {
        const { error } = await supabase.from('products').update(row).eq('id', existingId)
        if (error) { errors.push(`Zeile ${lineNum} (${name}): ${error.message}`); skipped++ }
        else updated++
      } else {
        const { error } = await supabase.from('products').insert({ id: randomUUID(), ...row })
        if (error) { errors.push(`Zeile ${lineNum} (${name}): ${error.message}`); skipped++ }
        else imported++
      }
    } catch (e) {
      errors.push(`Zeile ${lineNum}: ${e instanceof Error ? e.message : 'Fehler'}`)
      skipped++
    }
  }

  revalidatePath('/products')
  return { imported, updated, skipped, errors }
}
