'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { dealSchema, type DealInput } from '@/lib/validations/deal.schema'

export type ActionResult = { error?: Record<string, string[]> }

export async function createDeal(input: DealInput): Promise<ActionResult | void> {
  const parsed = dealSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .insert({
      ...parsed.data,
      expectedCloseAt: parsed.data.expectedCloseAt || null,
      companyId: parsed.data.companyId || null,
      ownerId: parsed.data.ownerId || null,
    })
    .select('id')
    .single()

  if (error) return { error: { _form: [error.message] } }

  revalidatePath('/deals')
  redirect(`/deals/${data.id}`)
}

export async function moveDealStage(
  dealId: string,
  stageId: string
): Promise<ActionResult | void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('deals')
    .update({ stageId })
    .eq('id', dealId)

  if (error) return { error: { _form: [error.message] } }
  revalidatePath('/deals')
}

export async function updateDeal(
  id: string,
  input: DealInput
): Promise<ActionResult | void> {
  const parsed = dealSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase
    .from('deals')
    .update({
      ...parsed.data,
      expectedCloseAt: parsed.data.expectedCloseAt || null,
      companyId: parsed.data.companyId || null,
      ownerId: parsed.data.ownerId || null,
    })
    .eq('id', id)

  if (error) return { error: { _form: [error.message] } }

  revalidatePath('/deals')
  revalidatePath(`/deals/${id}`)
  redirect(`/deals/${id}`)
}

export async function deleteDeal(id: string): Promise<ActionResult | void> {
  const supabase = await createClient()
  const { error } = await supabase.from('deals').delete().eq('id', id)
  if (error) return { error: { _form: [error.message] } }

  revalidatePath('/deals')
  redirect('/deals')
}
