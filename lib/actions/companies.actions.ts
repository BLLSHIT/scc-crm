'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { companySchema, type CompanyInput } from '@/lib/validations/company.schema'
import { logActivity } from '@/lib/db/activity-logs'

export type ActionResult = {
  error?: Record<string, string[]>
  redirectTo?: string
}

export async function createCompany(input: CompanyInput): Promise<ActionResult> {
  const parsed = companySchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('companies')
    .insert({
      id: randomUUID(),
      ...parsed.data,
      website: parsed.data.website || null,
      email: parsed.data.email || null,
      linkedin: parsed.data.linkedin || null,
      instagram: parsed.data.instagram || null,
      updatedAt: now,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createCompany] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  await logActivity({
    entityType: 'company',
    entityId: data.id,
    action: 'created',
    summary: `Firma „${parsed.data.name}" angelegt`,
  })

  revalidatePath('/companies')
  return { redirectTo: `/companies/${data.id}` }
}

export async function updateCompany(
  id: string,
  input: CompanyInput
): Promise<ActionResult> {
  const parsed = companySchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('companies')
    .update({
      ...parsed.data,
      website: parsed.data.website || null,
      email: parsed.data.email || null,
      linkedin: parsed.data.linkedin || null,
      instagram: parsed.data.instagram || null,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[updateCompany] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  await logActivity({
    entityType: 'company',
    entityId: id,
    action: 'updated',
    summary: `Firma „${parsed.data.name}" geändert`,
  })

  revalidatePath('/companies')
  revalidatePath(`/companies/${id}`)
  return { redirectTo: `/companies/${id}` }
}

export async function deleteCompany(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('companies').delete().eq('id', id)
  if (error) {
    console.error('[deleteCompany] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/companies')
  redirect('/companies')
}
