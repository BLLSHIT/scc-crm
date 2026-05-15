'use server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function verifySharePassword(token: string, password: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: project } = await supabase
    .from('projects')
    .select('"shareLinkPassword"')
    .eq('"shareToken"', token)
    .single()

  if (!project) return { error: 'Ungültiger Link' }
  if (!project.shareLinkPassword) return {}

  if (project.shareLinkPassword !== password.toUpperCase().trim()) {
    return { error: 'Falsches Passwort' }
  }

  const cookieStore = await cookies()
  cookieStore.set(`share_auth_${token}`, 'ok', {
    httpOnly: true,
    maxAge: 60 * 60 * 2,
    path: `/share/projects/${token}`,
    sameSite: 'lax',
  })

  return {}
}
