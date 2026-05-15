import { createClient } from '@/lib/supabase/server'

export type TriggerType =
  | 'deal_stage_changed'
  | 'quote_expiring'
  | 'deal_inactive'
  | 'project_status_changed'

export type ActionType = 'create_task' | 'create_project'

export interface WorkflowRule {
  id: string
  name: string
  isEnabled: boolean
  triggerType: TriggerType
  triggerConfig: Record<string, unknown>
  actionType: ActionType
  actionConfig: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export async function getWorkflowRules(): Promise<WorkflowRule[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workflow_rules')
    .select('*')
    .order('createdAt', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as WorkflowRule[]
}

export async function getWorkflowRuleById(id: string): Promise<WorkflowRule | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workflow_rules')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data as WorkflowRule
}

export async function getPipelineStages(): Promise<{ id: string; name: string; order: number }[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('id, name, order')
    .order('order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as { id: string; name: string; order: number }[]
}
