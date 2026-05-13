'use server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { productSchema, type ProductInput } from '@/lib/validations/product.schema'

export type ActionResult = {
  error?: Record<string, string[]>
  redirectTo?: string
}

function clean(input: ProductInput) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    sku: input.sku?.trim() || null,
    category: input.category?.trim() || null,
    unit: input.unit?.trim() || 'Stück',
    defaultPriceNet: input.defaultPriceNet,
    defaultVatRate: input.defaultVatRate,
    imageUrl: input.imageUrl?.trim() || null,
    isActive: input.isActive,
  }
}

export async function createProduct(input: ProductInput): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase.from('products').insert({
    id: randomUUID(),
    ...clean(parsed.data),
    updatedAt: new Date().toISOString(),
  })
  if (error) {
    console.error('[createProduct] error:', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/products')
  return { redirectTo: '/products' }
}

export async function updateProduct(id: string, input: ProductInput): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({ ...clean(parsed.data), updatedAt: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    console.error('[updateProduct] error:', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/products')
  return { redirectTo: '/products' }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) {
    console.error('[deleteProduct] error:', error)
    return { error: { _form: [error.message] } }
  }
  revalidatePath('/products')
  redirect('/products')
}
