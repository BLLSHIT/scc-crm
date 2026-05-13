'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { companySchema, type CompanyInput } from '@/lib/validations/company.schema'

export type ActionResult = {
  error?: Record<string, string[]>
}

export async function createCompany(input: CompanyInput): Promise<ActionResult | void> {
  const parsed = companySchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .insert({
      ...parsed.data,
      website: parsed.data.website || null,
      email: parsed.data.email || null,
    })
    .select('id')
    .single()

  if (error) return { error: { _form: [error.message] } }

  revalidatePath('/companies')
  redirect(`/companies/${data.id}`)
}

export async function updateCompany(
  id: string,
  input: CompanyInput
): Promise<ActionResult | void> {
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
    })
    .eq('id', id)

  if (error) return { error: { _form: [error.message] } }

  revalidatePath('/companies')
  revalidatePath(`/companies/${id}`)
  redirect(`/companies/${id}`)
}

export async function deleteCompany(id: string): Promise<ActionResult | void> {
  const supabase = await createClient()
  const { error } = await supabase.from('companies').delete().eq('id', id)
  if (error) return { error: { _form: [error.message] } }

  revalidatePath('/companies')
  redirect('/companies')
}
