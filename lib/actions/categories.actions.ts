'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { categorySchema, type CategoryInput } from '@/lib/validations/category.schema'

export type ActionResult = {
  error?: Record<string, string[]>
  redirectTo?: string
}

function clean(input: CategoryInput) {
  return {
    name: input.name.trim(),
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  }
}

export async function createCategory(input: CategoryInput): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase.from('product_categories').insert({
    id: randomUUID(),
    ...clean(parsed.data),
    updatedAt: new Date().toISOString(),
  })
  if (error) {
    console.error('[createCategory] error:', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/categories')
  revalidatePath('/products')
  return { redirectTo: '/categories' }
}

export async function updateCategory(id: string, input: CategoryInput): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()

  // Falls Name geändert wurde: alle Produkte mit altem Namen aktualisieren
  const { data: existing } = await supabase
    .from('product_categories').select('name').eq('id', id).single()
  const oldName = existing?.name
  const newName = parsed.data.name.trim()

  const { error } = await supabase
    .from('product_categories')
    .update({ ...clean(parsed.data), updatedAt: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    console.error('[updateCategory] error:', error)
    return { error: { _form: [error.message] } }
  }

  if (oldName && oldName !== newName) {
    const { error: prodErr } = await supabase
      .from('products')
      .update({ category: newName, updatedAt: new Date().toISOString() })
      .eq('category', oldName)
    if (prodErr) {
      console.error('[updateCategory] product rename error:', prodErr)
    }
  }

  revalidatePath('/categories')
  revalidatePath('/products')
  return { redirectTo: '/categories' }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  // Vorher: betroffene Produkte „leeren" damit sie nicht ins Leere zeigen
  const { data: cat } = await supabase
    .from('product_categories').select('name').eq('id', id).single()
  if (cat?.name) {
    await supabase
      .from('products')
      .update({ category: null, updatedAt: new Date().toISOString() })
      .eq('category', cat.name)
  }

  const { error } = await supabase.from('product_categories').delete().eq('id', id)
  if (error) {
    console.error('[deleteCategory] error:', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/categories')
  revalidatePath('/products')
  redirect('/categories')
}
