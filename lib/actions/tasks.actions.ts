'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { taskSchema, type TaskInput } from '@/lib/validations/task.schema'

export type ActionResult = {
  error?: Record<string, string[]>
  redirectTo?: string
}

function clean(input: TaskInput) {
  return {
    title: input.title,
    description: input.description?.trim() || null,
    status: input.status,
    priority: input.priority,
    dueDate: input.dueDate || null,
    assigneeId: input.assigneeId || null,
    dealId: input.dealId || null,
    contactId: input.contactId || null,
    companyId: input.companyId || null,
  }
}

export async function createTask(input: TaskInput): Promise<ActionResult> {
  const parsed = taskSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const now = new Date().toISOString()
  const { error } = await supabase.from('tasks').insert({
    id: randomUUID(),
    ...clean(parsed.data),
    updatedAt: now,
  })

  if (error) {
    console.error('[createTask] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/tasks')
  if (parsed.data.dealId) revalidatePath(`/deals/${parsed.data.dealId}`)
  if (parsed.data.contactId) revalidatePath(`/contacts/${parsed.data.contactId}`)
  if (parsed.data.companyId) revalidatePath(`/companies/${parsed.data.companyId}`)
  return { redirectTo: '/tasks' }
}

export async function updateTask(id: string, input: TaskInput): Promise<ActionResult> {
  const parsed = taskSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ ...clean(parsed.data), updatedAt: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[updateTask] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/tasks')
  return { redirectTo: '/tasks' }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) {
    console.error('[deleteTask] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/tasks')
  return {}
}

export async function toggleTaskStatus(
  id: string,
  newStatus: 'open' | 'in_progress' | 'done'
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus, updatedAt: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[toggleTaskStatus] Supabase error:', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/tasks')
  return {}
}
