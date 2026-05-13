'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { textModuleSchema, type TextModuleInput } from '@/lib/validations/text-module.schema'

export type ActionResult = {
  error?: Record<string, string[]>
  redirectTo?: string
}

function clean(input: TextModuleInput) {
  return {
    name: input.name.trim(),
    type: input.type,
    content: input.content,
    isDefault: input.isDefault,
    sortOrder: input.sortOrder,
  }
}

export async function createTextModule(input: TextModuleInput): Promise<ActionResult> {
  const parsed = textModuleSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase.from('text_modules').insert({
    id: randomUUID(),
    ...clean(parsed.data),
    updatedAt: new Date().toISOString(),
  })
  if (error) {
    console.error('[createTextModule] error:', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/text-modules')
  return { redirectTo: '/text-modules' }
}

export async function updateTextModule(id: string, input: TextModuleInput): Promise<ActionResult> {
  const parsed = textModuleSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase
    .from('text_modules')
    .update({ ...clean(parsed.data), updatedAt: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    console.error('[updateTextModule] error:', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/text-modules')
  return { redirectTo: '/text-modules' }
}

export async function deleteTextModule(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('text_modules').delete().eq('id', id)
  if (error) {
    console.error('[deleteTextModule] error:', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/text-modules')
  redirect('/text-modules')
}
