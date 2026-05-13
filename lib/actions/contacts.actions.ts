'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { contactSchema, type ContactInput } from '@/lib/validations/contact.schema'

export type ActionResult = {
  error?: Record<string, string[]>
}

export async function createContact(input: ContactInput): Promise<ActionResult | void> {
  const parsed = contactSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      ...parsed.data,
      email: parsed.data.email || null,
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

  revalidatePath('/contacts')
  redirect(`/contacts/${data.id}`)
}

export async function updateContact(
  id: string,
  input: ContactInput
): Promise<ActionResult | void> {
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
      companyId: parsed.data.companyId || null,
      ownerId: parsed.data.ownerId || null,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[updateContact] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/contacts')
  revalidatePath(`/contacts/${id}`)
  redirect(`/contacts/${id}`)
}

export async function deleteContact(id: string): Promise<ActionResult | void> {
  const supabase = await createClient()
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) return { error: { _form: [error.message] } }

  revalidatePath('/contacts')
  redirect('/contacts')
}
