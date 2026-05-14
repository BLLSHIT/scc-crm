'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Mail, ShieldCheck, KeyRound } from 'lucide-react'
import { inviteTeamMember, updateProfileRole } from '@/lib/actions/team-invite.actions'

interface Props {
  teamMemberId: string
  email: string
  profileId: string | null
  currentRole: string | null
  isCurrentUserAdmin: boolean
}

export function TeamMemberInvite({
  teamMemberId,
  email,
  profileId,
  currentRole,
  isCurrentUserAdmin,
}: Props) {
  const router = useRouter()
  const [role, setRole] = useState<'admin' | 'sales' | 'project_manager' | 'viewer'>(
    (currentRole as 'admin' | 'sales' | 'project_manager' | 'viewer') ?? 'sales'
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  if (!isCurrentUserAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-slate-400" />
            Login & Rolle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            {profileId
              ? `Hat einen Login (Rolle: ${currentRole ?? '—'}).`
              : 'Noch kein Login. Nur Administratoren können Einladungen versenden.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  function invite() {
    setError(null); setSuccess(null)
    startTransition(async () => {
      const r = await inviteTeamMember(teamMemberId, role)
      if (r.error) setError(r.error)
      else {
        setSuccess(`Einladung an ${email} versendet.`)
        router.refresh()
      }
    })
  }

  function changeRole() {
    if (!profileId) return
    setError(null); setSuccess(null)
    startTransition(async () => {
      const r = await updateProfileRole(profileId, role)
      if (r.error) setError(r.error)
      else {
        setSuccess('Rolle aktualisiert.')
        router.refresh()
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-blue-600" />
          Login & Rolle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">{success}</div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="role">Rolle</Label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'sales' | 'project_manager' | 'viewer')}
            className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
          >
            <option value="admin">Administrator</option>
            <option value="sales">Vertrieb</option>
            <option value="project_manager">Projekt-Manager</option>
            <option value="viewer">Nur lesend</option>
          </select>
        </div>

        {profileId ? (
          <>
            <p className="text-xs text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Hat Login (aktuelle Rolle: {currentRole ?? '—'})
            </p>
            <Button type="button" size="sm" onClick={changeRole} className="w-full">
              Rolle übernehmen
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              Kein Login vorhanden. Wir versenden eine Einladungs-Mail an
              <strong className="text-slate-700"> {email}</strong>.
            </p>
            <Button type="button" size="sm" onClick={invite} className="w-full">
              <Mail className="w-4 h-4 mr-2" />
              Einladung versenden
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
