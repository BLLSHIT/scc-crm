'use server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/db/activity-logs'

export type InviteResult = { error?: string; success?: boolean }

/**
 * Lädt ein Team-Mitglied per E-Mail in die App ein.
 * Nutzt SUPABASE_SERVICE_ROLE_KEY → muss serverseitig bleiben.
 * Der eingeladene User bekommt eine Magic-Link-Mail, setzt sein Passwort
 * und beim ersten Login wird via handle_new_user-Trigger sein Profil erzeugt.
 */
export async function inviteTeamMember(
  teamMemberId: string,
  role: 'admin' | 'sales' | 'project_manager' | 'viewer' = 'sales'
): Promise<InviteResult> {
  // Aktuellen User checken — nur Admins dürfen einladen
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) return { error: 'Nicht angemeldet.' }
  const { data: currentProfile } = await supabase
    .from('profiles').select('role').eq('id', currentUser.id).single()
  if (currentProfile?.role !== 'admin') {
    return { error: 'Nur Administratoren können Einladungen versenden.' }
  }

  // Team-Mitglied laden
  const { data: tm, error: tmErr } = await supabase
    .from('team_members')
    .select('id, firstName, lastName, email, profileId')
    .eq('id', teamMemberId)
    .single()
  if (tmErr || !tm) return { error: 'Team-Mitglied nicht gefunden.' }
  if (tm.profileId) return { error: 'Dieses Team-Mitglied hat bereits einen Login.' }

  // Admin-Client mit Service-Role-Key
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !supabaseUrl) {
    return { error: 'SUPABASE_SERVICE_ROLE_KEY ist in Vercel nicht gesetzt.' }
  }
  const admin = createSupabaseAdmin(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Invite per Magic-Link
  const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(
    tm.email,
    {
      data: {
        firstName: tm.firstName,
        lastName: tm.lastName,
      },
      redirectTo: `${supabaseUrl.replace('.supabase.co', '.vercel.app')}/login`,
    }
  )
  if (invErr) {
    console.error('[inviteTeamMember] invite error:', invErr)
    return { error: invErr.message }
  }

  const newUserId = invited?.user?.id
  if (!newUserId) {
    return { error: 'Einladung versendet, aber keine User-ID zurückgegeben.' }
  }

  // Profile soll von handle_new_user erzeugt worden sein — wir setzen die Rolle
  // und verlinken team_members.profileId
  await admin.from('profiles').update({ role }).eq('id', newUserId)
  await admin.from('team_members').update({ profileId: newUserId }).eq('id', teamMemberId)

  await logActivity({
    entityType: 'team_member',
    entityId: teamMemberId,
    action: 'created',
    summary: `Login-Einladung an ${tm.email} (Rolle: ${role})`,
  })

  revalidatePath('/teams')
  revalidatePath(`/teams/${teamMemberId}/edit`)
  return { success: true }
}

/** Setzt die Rolle eines Profils — nur Admins */
export async function updateProfileRole(
  profileId: string,
  role: 'admin' | 'sales' | 'project_manager' | 'viewer'
): Promise<InviteResult> {
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) return { error: 'Nicht angemeldet.' }
  const { data: currentProfile } = await supabase
    .from('profiles').select('role').eq('id', currentUser.id).single()
  if (currentProfile?.role !== 'admin') {
    return { error: 'Nur Administratoren können Rollen ändern.' }
  }

  const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId)
  if (error) return { error: error.message }
  revalidatePath('/teams')
  return { success: true }
}
