/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { BuildTeamMemberForm } from '@/components/build-teams/BuildTeamMemberForm'
import { getBuildTeamMemberById, getBuildTeamById } from '@/lib/db/build-teams'
import { updateBuildTeamMember, deleteBuildTeamMember } from '@/lib/actions/build-teams.actions'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function EditBuildTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string; memberId: string }>
}) {
  const { id, memberId } = await params
  let profile: Profile | null = null
  let team: any
  let member: any
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    team = await getBuildTeamById(id)
    member = await getBuildTeamMemberById(memberId)
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Mitglied laden" err={err} />
  }
  if (!member) return <div className="p-6">Mitglied nicht gefunden.</div>

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`${team?.name ?? 'Bauteam'} — Mitglied bearbeiten`}
        profile={profile}
        actions={
          <form action={async () => {
            'use server'
            await deleteBuildTeamMember(memberId)
            redirect(`/build-teams/${id}`)
          }}>
            <Button size="sm" variant="destructive" type="submit">
              <Trash2 className="w-4 h-4 mr-2" />Löschen
            </Button>
          </form>
        }
      />
      <main className="p-6">
        <BuildTeamMemberForm
          title="Mitglied bearbeiten"
          defaultValues={{
            firstName: member.firstName ?? '',
            lastName: member.lastName ?? '',
            role: member.role ?? '',
            phone: member.phone ?? '',
            email: member.email ?? '',
            isExternal: member.isExternal ?? false,
            companyName: member.companyName ?? '',
            notes: member.notes ?? '',
            isActive: member.isActive ?? true,
            sortOrder: member.sortOrder ?? 0,
          }}
          onSubmit={updateBuildTeamMember.bind(null, memberId)}
        />
      </main>
    </div>
  )
}
