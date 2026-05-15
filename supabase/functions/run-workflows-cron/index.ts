import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TriggerType = 'quote_expiring' | 'deal_inactive'

interface WorkflowRule {
  id: string
  name: string
  isEnabled: boolean
  triggerType: TriggerType
  triggerConfig: Record<string, unknown>
  actionType: 'create_task' | 'create_project'
  actionConfig: Record<string, unknown>
}

interface QuoteRow {
  id: string
  quoteNumber: string
  status: string
  validUntil: string
  dealId: string | null
  company: { name: string } | null
}

interface DealRow {
  id: string
  title: string
  updatedAt: string
  company: { name: string } | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function interpolate(template: string, ctx: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(ctx[key] ?? `{{${key}}}`))
}

/** Returns a date string like "2026-05-20" for today + n days */
function todayPlusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Returns today's date as "YYYY-MM-DD" */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Handler: quote_expiring
// ---------------------------------------------------------------------------

async function processQuoteExpiringRule(
  rule: WorkflowRule,
  supabase: ReturnType<typeof createClient>
): Promise<number> {
  const daysBeforeExpiry = Number(rule.triggerConfig.daysBeforeExpiry)
  if (isNaN(daysBeforeExpiry)) {
    console.error(`[run-workflows-cron] rule ${rule.id}: invalid daysBeforeExpiry`, rule.triggerConfig)
    return 0
  }

  const targetDate = todayPlusDays(daysBeforeExpiry)

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('id, quoteNumber, status, validUntil, dealId, company:companies(name)')
    .in('status', ['draft', 'sent'])
    .eq('validUntil', targetDate)

  if (error) {
    console.error(`[run-workflows-cron] rule ${rule.id}: failed to query quotes`, error)
    return 0
  }

  if (!quotes || quotes.length === 0) return 0

  const cfg = rule.actionConfig
  const now = new Date().toISOString()
  const today = todayIso()
  let created = 0

  for (const quote of quotes as QuoteRow[]) {
    const context = {
      quoteNumber: quote.quoteNumber,
      companyName: quote.company?.name ?? '',
      daysUntilExpiry: daysBeforeExpiry,
    }

    const { error: insertError } = await supabase.from('tasks').insert({
      id: crypto.randomUUID(),
      title: interpolate(String(cfg.title ?? ''), context),
      description: cfg.description
        ? interpolate(String(cfg.description), context)
        : null,
      dueDate: today,
      status: 'open',
      priority: 'medium',
      assigneeId: (cfg.assigneeId as string | undefined) ?? null,
      dealId: quote.dealId ?? null,
      contactId: null,
      companyId: null,
      createdAt: now,
      updatedAt: now,
    })

    if (insertError) {
      console.error(
        `[run-workflows-cron] rule ${rule.id}: failed to insert task for quote ${quote.id}`,
        insertError
      )
    } else {
      created++
    }
  }

  return created
}

// ---------------------------------------------------------------------------
// Handler: deal_inactive
// ---------------------------------------------------------------------------

async function processDealInactiveRule(
  rule: WorkflowRule,
  supabase: ReturnType<typeof createClient>
): Promise<number> {
  const days = Number(rule.triggerConfig.days)
  if (isNaN(days)) {
    console.error(`[run-workflows-cron] rule ${rule.id}: invalid days`, rule.triggerConfig)
    return 0
  }

  // Fetch open stage IDs (stages that are neither won nor lost)
  const { data: stages, error: stagesError } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('isWon', false)
    .eq('isLost', false)

  if (stagesError) {
    console.error(`[run-workflows-cron] rule ${rule.id}: failed to query pipeline_stages`, stagesError)
    return 0
  }

  const openStageIds = (stages ?? []).map((s: { id: string }) => s.id)
  if (openStageIds.length === 0) return 0

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data: deals, error } = await supabase
    .from('deals')
    .select('id, title, updatedAt, company:companies(name)')
    .in('stageId', openStageIds)
    .lt('updatedAt', cutoff)

  if (error) {
    console.error(`[run-workflows-cron] rule ${rule.id}: failed to query deals`, error)
    return 0
  }

  if (!deals || deals.length === 0) return 0

  const cfg = rule.actionConfig
  const now = new Date().toISOString()
  const today = todayIso()
  let created = 0

  for (const deal of deals as DealRow[]) {
    const context = {
      dealTitle: deal.title,
      companyName: deal.company?.name ?? '',
      daysSinceActivity: days,
    }

    const { error: insertError } = await supabase.from('tasks').insert({
      id: crypto.randomUUID(),
      title: interpolate(String(cfg.title ?? ''), context),
      description: cfg.description
        ? interpolate(String(cfg.description), context)
        : null,
      dueDate: today,
      status: 'open',
      priority: 'medium',
      assigneeId: (cfg.assigneeId as string | undefined) ?? null,
      dealId: deal.id,
      contactId: null,
      companyId: null,
      createdAt: now,
      updatedAt: now,
    })

    if (insertError) {
      console.error(
        `[run-workflows-cron] rule ${rule.id}: failed to insert task for deal ${deal.id}`,
        insertError
      )
    } else {
      created++
    }
  }

  return created
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // Auth check
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Load enabled time-based workflow rules
  const { data: rules, error: rulesError } = await supabase
    .from('workflow_rules')
    .select('*')
    .eq('isEnabled', true)
    .in('triggerType', ['quote_expiring', 'deal_inactive'])

  if (rulesError) {
    console.error('[run-workflows-cron] failed to load workflow rules', rulesError)
    return new Response(JSON.stringify({ error: 'Failed to load workflow rules' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let totalTasksCreated = 0

  for (const rule of (rules ?? []) as WorkflowRule[]) {
    try {
      if (rule.triggerType === 'quote_expiring') {
        const count = await processQuoteExpiringRule(rule, supabase)
        totalTasksCreated += count
      } else if (rule.triggerType === 'deal_inactive') {
        const count = await processDealInactiveRule(rule, supabase)
        totalTasksCreated += count
      }
    } catch (err) {
      console.error(`[run-workflows-cron] unhandled error for rule ${rule.id}:`, err)
    }
  }

  return new Response(JSON.stringify({ processed: totalTasksCreated }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
