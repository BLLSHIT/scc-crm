import { createClient } from '@/lib/supabase/server'
import { interpolate } from './variable-interpolation'

export type TriggerType =
  | 'deal_stage_changed'
  | 'quote_expiring'
  | 'deal_inactive'
  | 'project_status_changed'

export interface WorkflowContext {
  dealId?: string
  stageId?: string
  dealTitle?: string
  companyName?: string
  projectId?: string
  status?: string
  projectName?: string
  quoteId?: string
  quoteNumber?: string
  daysUntilExpiry?: number
  daysSinceActivity?: number
}

interface WorkflowRule {
  id: string
  name: string
  isEnabled: boolean
  triggerType: TriggerType
  triggerConfig: Record<string, unknown>
  actionType: 'create_task' | 'create_project'
  actionConfig: Record<string, unknown>
}

function matchesTrigger(rule: WorkflowRule, context: WorkflowContext): boolean {
  const cfg = rule.triggerConfig
  switch (rule.triggerType) {
    case 'deal_stage_changed':
      return cfg.stageId == null || cfg.stageId === context.stageId
    case 'quote_expiring':
      return cfg.daysBeforeExpiry == null || cfg.daysBeforeExpiry === context.daysUntilExpiry
    case 'deal_inactive':
      return (
        cfg.days == null ||
        (context.daysSinceActivity != null && Number(cfg.days) <= context.daysSinceActivity)
      )
    case 'project_status_changed':
      return cfg.status == null || cfg.status === context.status
    default:
      return false
  }
}

function todayPlusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

async function executeAction(
  rule: WorkflowRule,
  context: WorkflowContext
): Promise<void> {
  const supabase = await createClient()
  const cfg = rule.actionConfig
  const now = new Date().toISOString()

  if (rule.actionType === 'create_task') {
    const { error } = await supabase.from('tasks').insert({
      id: crypto.randomUUID(),
      title: interpolate(String(cfg.title ?? ''), context as Record<string, unknown>),
      description: cfg.description
        ? interpolate(String(cfg.description), context as Record<string, unknown>)
        : null,
      status: 'open',
      priority: 'medium',
      dueDate: cfg.dueDays != null ? todayPlusDays(Number(cfg.dueDays)) : null,
      assigneeId: (cfg.assigneeId as string | undefined) ?? null,
      dealId: (cfg.dealId as string | undefined) ?? context.dealId ?? null,
      projectId: (cfg.projectId as string | undefined) ?? context.projectId ?? null,
      contactId: null,
      companyId: null,
      updatedAt: now,
    })
    if (error) throw error
  } else if (rule.actionType === 'create_project') {
    let companyId: string | null = null
    if (cfg.copyCompanyId === true && context.dealId) {
      const { data: deal } = await supabase
        .from('deals')
        .select('companyId')
        .eq('id', context.dealId)
        .single()
      companyId = deal?.companyId ?? null
    }

    const { error } = await supabase.from('projects').insert({
      id: crypto.randomUUID(),
      name: interpolate(String(cfg.nameTemplate ?? ''), context as Record<string, unknown>),
      status: (cfg.status as string | undefined) ?? 'planning',
      companyId,
      createdAt: now,
      updatedAt: now,
    })
    if (error) throw error
  }
}

export async function runWorkflows(
  triggerType: TriggerType,
  context: WorkflowContext
): Promise<void> {
  const supabase = await createClient()

  const { data: rules, error } = await supabase
    .from('workflow_rules')
    .select('*')
    .eq('isEnabled', true)
    .eq('triggerType', triggerType)

  if (error) {
    console.error('Failed to load workflow rules:', error)
    return
  }

  for (const rule of (rules ?? []) as WorkflowRule[]) {
    if (!matchesTrigger(rule, context)) continue
    try {
      await executeAction(rule, context)
    } catch (err) {
      console.error('Workflow rule failed:', rule.id, err)
    }
  }
}
