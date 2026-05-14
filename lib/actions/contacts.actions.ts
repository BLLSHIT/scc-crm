'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { contactSchema, type ContactInput } from '@/lib/validations/contact.schema'
import { logActivity } from '@/lib/db/activity-logs'

export type ActionResult = {
  error?: Record<string, string[]>
  redirectTo?: string
}

export async function createContact(input: ContactInput): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      id: randomUUID(),
      ...parsed.data,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      mobile: parsed.data.mobile || null,
      linkedin: parsed.data.linkedin || null,
      instagram: parsed.data.instagram || null,
      companyId: parsed.data.companyId || null,
      ownerId: parsed.data.ownerId || null,
      updatedAt: now,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createContact] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  await logActivity({
    entityType: 'contact',
    entityId: data.id,
    action: 'created',
    summary: `Kontakt „${parsed.data.firstName} ${parsed.data.lastName}" angelegt`,
  })

  revalidatePath('/contacts')
  return { redirectTo: `/contacts/${data.id}` }
}

export async function updateContact(
  id: string,
  input: ContactInput
): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('contacts')
    .update({
      ...parsed.data,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      mobile: parsed.data.mobile || null,
      linkedin: parsed.data.linkedin || null,
      instagram: parsed.data.instagram || null,
      companyId: parsed.data.companyId || null,
      ownerId: parsed.data.ownerId || null,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[updateContact] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  await logActivity({
    entityType: 'contact',
    entityId: id,
    action: 'updated',
    summary: `Kontakt „${parsed.data.firstName} ${parsed.data.lastName}" geändert`,
  })

  revalidatePath('/contacts')
  revalidatePath(`/contacts/${id}`)
  return { redirectTo: `/contacts/${id}` }
}

export type QuickContactInput = {
  firstName: string
  lastName: string
  email?: string
  position?: string
  companyId: string
}

export type QuickContactResult = {
  error?: string
  contact?: {
    id: string
    firstName: string
    lastName: string
    position: string | null
    companyId: string | null
  }
}

export async function createQuickContact(
  input: QuickContactInput
): Promise<QuickContactResult> {
  if (!input.firstName?.trim() || !input.lastName?.trim()) {
    return { error: 'Vor- und Nachname erforderlich.' }
  }
  if (!input.companyId) {
    return { error: 'Firma erforderlich für Schnell-Anlage.' }
  }

  const supabase = await createClient()
  const id = randomUUID()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      id,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email?.trim() || null,
      position: input.position?.trim() || null,
      companyId: input.companyId,
      updatedAt: now,
    })
    .select('id, firstName, lastName, position, companyId')
    .single()

  if (error) {
    console.error('[createQuickContact] Supabase error:', error)
    return { error: error.message }
  }

  revalidatePath('/contacts')
  return { contact: data }
}

export async function deleteContact(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) {
    console.error('[deleteContact] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/contacts')
  redirect('/contacts')
}
