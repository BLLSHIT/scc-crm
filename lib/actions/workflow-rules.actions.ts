'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { TriggerType, ActionType } from '@/lib/db/workflow-rules'

export type ActionResult = {
  error?: Record<string, string[]>
  redirectTo?: string
}

interface WorkflowRuleInput {
  name: string
  isEnabled: boolean
  triggerType: TriggerType
  triggerConfig: Record<string, unknown>
  actionType: ActionType
  actionConfig: Record<string, unknown>
}

export async function createWorkflowRule(input: WorkflowRuleInput): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Unauthorized'] } }

  if (!input.name.trim()) {
    return { error: { name: ['Name is required'] } }
  }

  const now = new Date().toISOString()
  const { error } = await supabase.from('workflow_rules').insert({
    id: randomUUID(),
    name: input.name.trim(),
    isEnabled: input.isEnabled,
    triggerType: input.triggerType,
    triggerConfig: input.triggerConfig,
    actionType: input.actionType,
    actionConfig: input.actionConfig,
    createdAt: now,
    updatedAt: now,
  })

  if (error) {
    console.error('[createWorkflowRule] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/settings/workflows')
  return { redirectTo: '/settings/workflows' }
}

export async function updateWorkflowRule(
  id: string,
  input: WorkflowRuleInput
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Unauthorized'] } }

  if (!input.name.trim()) {
    return { error: { name: ['Name is required'] } }
  }

  const { error } = await supabase
    .from('workflow_rules')
    .update({
      name: input.name.trim(),
      isEnabled: input.isEnabled,
      triggerType: input.triggerType,
      triggerConfig: input.triggerConfig,
      actionType: input.actionType,
      actionConfig: input.actionConfig,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[updateWorkflowRule] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/settings/workflows')
  return { redirectTo: '/settings/workflows' }
}

export async function deleteWorkflowRule(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Unauthorized'] } }

  const { error } = await supabase.from('workflow_rules').delete().eq('id', id)

  if (error) {
    console.error('[deleteWorkflowRule] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/settings/workflows')
  return {}
}

export async function toggleWorkflowRule(
  id: string,
  isEnabled: boolean
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Unauthorized'] } }

  const { error } = await supabase
    .from('workflow_rules')
    .update({ isEnabled, updatedAt: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[toggleWorkflowRule] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/settings/workflows')
  return {}
}
