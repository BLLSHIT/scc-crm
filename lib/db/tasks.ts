import { createClient } from '@/lib/supabase/server'

export interface TaskFilters {
  q?: string
  status?: 'open' | 'in_progress' | 'done'
  assigneeId?: string
  dealId?: string
  contactId?: string
  companyId?: string
}

export async function getTasks(filters: TaskFilters = {}) {
  const supabase = await createClient()
  let query = supabase
    .from('tasks')
    .select(
      `id, title, description, status, priority, dueDate, createdAt, updatedAt,
       assigneeId, dealId, contactId, companyId,
       assignee:profiles(id, firstName, lastName),
       deal:deals(id, title),
       contact:contacts(id, firstName, lastName),
       company:companies(id, name)`
    )
    .order('dueDate', { ascending: true, nullsFirst: false })
    .order('createdAt', { ascending: false })

  if (filters.q) {
    query = query.ilike('title', `%${filters.q}%`)
  }
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.assigneeId) query = query.eq('assigneeId', filters.assigneeId)
  if (filters.dealId) query = query.eq('dealId', filters.dealId)
  if (filters.contactId) query = query.eq('contactId', filters.contactId)
  if (filters.companyId) query = query.eq('companyId', filters.companyId)

  const { data, error } = await query
  if (error) {
    console.error('[getTasks] error:', error)
    throw new Error(error.message)
  }
  return data ?? []
}

export async function getTaskById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    console.error('[getTaskById] error:', error)
    throw new Error(error.message)
  }
  return data
}
