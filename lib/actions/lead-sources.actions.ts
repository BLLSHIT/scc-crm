'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { lookupSchema, type LookupInput } from '@/lib/validations/lookup.schema'

export type ActionResult = { error?: Record<string, string[]>; redirectTo?: string }

const TABLE = 'lead_sources'
const PATH = '/lead-sources'

export async function createLeadSource(input: LookupInput): Promise<ActionResult> {
  const parsed = lookupSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createClient()
  const { error } = await supabase.from(TABLE).insert({
    id: randomUUID(),
    name: parsed.data.name.trim(),
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive,
    updatedAt: new Date().toISOString(),
  })
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(PATH); revalidatePath('/contacts')
  return { redirectTo: PATH }
}

export async function updateLeadSource(id: string, input: LookupInput): Promise<ActionResult> {
  const parsed = lookupSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const supabase = await createClient()
  const { data: existing } = await supabase.from(TABLE).select('name').eq('id', id).single()
  const oldName = existing?.name
  const newName = parsed.data.name.trim()
  const { error } = await supabase.from(TABLE).update({
    name: newName,
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive,
    updatedAt: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  if (oldName && oldName !== newName) {
    await supabase.from('contacts')
      .update({ source: newName, updatedAt: new Date().toISOString() })
      .eq('source', oldName)
  }
  revalidatePath(PATH); revalidatePath('/contacts')
  return { redirectTo: PATH }
}

export async function deleteLeadSource(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: row } = await supabase.from(TABLE).select('name').eq('id', id).single()
  if (row?.name) {
    await supabase.from('contacts').update({ source: null, updatedAt: new Date().toISOString() }).eq('source', row.name)
  }
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) return { error: { _form: [error.message] } }
  revalidatePath(PATH); revalidatePath('/contacts')
  redirect(PATH)
}
