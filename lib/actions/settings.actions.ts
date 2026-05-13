'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { settingsSchema, type SettingsInput } from '@/lib/validations/settings.schema'

export type ActionResult = {
  error?: Record<string, string[]>
  redirectTo?: string
}

export async function updateSettings(input: SettingsInput): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const payload = {
    ...parsed.data,
    companyEmail: parsed.data.companyEmail || null,
    companyWebsite: parsed.data.companyWebsite || null,
    logoUrl: parsed.data.logoUrl || null,
    updatedAt: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('settings')
    .update(payload)
    .eq('id', 'singleton')

  if (error) {
    console.error('[updateSettings] error:', error)
    return { error: { _form: [error.message] } }
  }

  revalidatePath('/settings')
  return { redirectTo: '/settings' }
}
