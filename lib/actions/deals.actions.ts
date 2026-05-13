'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { dealSchema, type DealInput } from '@/lib/validations/deal.schema'

export type ActionResult = { error?: Record<string, string[]>; redirectTo?: string }

export async function createDeal(input: DealInput): Promise<ActionResult> {
  const parsed = dealSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('deals')
    .insert({
      ...parsed.data,
      expectedCloseAt: parsed.data.expectedCloseAt || null,
      companyId: parsed.data.companyId || null,
      ownerId: parsed.data.ownerId || null,
      updatedAt: now,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createDeal] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/deals')
  return { redirectTo: `/deals/${data.id}` }
}

export async function moveDealStage(
  dealId: string,
  stageId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('deals')
    .update({ stageId, updatedAt: new Date().toISOString() })
    .eq('id', dealId)

  if (error) {
    console.error('[moveDealStage] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/deals')
  return {}
}

export async function updateDeal(
  id: string,
  input: DealInput
): Promise<ActionResult> {
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
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[updateDeal] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/deals')
  revalidatePath(`/deals/${id}`)
  return { redirectTo: `/deals/${id}` }
}

export async function deleteDeal(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('deals').delete().eq('id', id)
  if (error) {
    console.error('[deleteDeal] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/deals')
  redirect('/deals')
}
