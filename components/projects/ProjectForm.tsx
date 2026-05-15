'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { projectSchema, type ProjectInput } from '@/lib/validations/project.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { createProject } from '@/lib/actions/projects.actions'

type ActionResult = Awaited<ReturnType<typeof createProject>>

interface CompanyOption { id: string; name: string }
interface ContactOption { id: string; firstName: string; lastName: string; companyId?: string | null }
interface TeamMemberOption { id: string; firstName: string; lastName: string }
interface DealOption { id: string; title: string; company?: { id: string; name: string } | null }
interface BuildTeamOption { id: string; name: string }

interface Props {
  defaultValues?: Partial<ProjectInput>
  onSubmit: (data: ProjectInput) => Promise<ActionResult>
  title: string
  companies?: CompanyOption[]
  contacts?: ContactOption[]
  teamMembers?: TeamMemberOption[]
  deals?: DealOption[]
  buildTeams?: BuildTeamOption[]
}

export function ProjectForm({
  defaultValues, onSubmit, title,
  companies = [], contacts = [], teamMembers = [], deals = [], buildTeams = [],
}: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, control, handleSubmit, formState: { errors } } = useForm<ProjectInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(projectSchema) as any,
    defaultValues: {
      status: 'planning',
      ...defaultValues,
    },
  })

  const watchedCompanyId = useWatch({ control, name: 'companyId' }) ?? ''
  const filteredContacts = watchedCompanyId
    ? contacts.filter((c) => c.companyId === watchedCompanyId)
    : contacts

  async function submit(data: ProjectInput) {
    setServerError(null); setIsPending(true)
    try {
      const result = await onSubmit(data)
      if (result.error) {
        const msg = result.error._form?.[0] ?? Object.values(result.error).flat()[0] ?? 'Fehler.'
        setServerError(msg)
      } else if (result.redirectTo) {
        router.push(result.redirectTo)
      }
    } catch (e) {
      console.error('ProjectForm submit', e)
      setServerError('Ein unerwarteter Fehler ist aufgetreten.')
    } finally { setIsPending(false) }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6 max-w-4xl">
      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <strong>Fehler:</strong> {serverError}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Projektname *</Label>
            <Input id="name" {...register('name')} placeholder="z.B. Padel Court Hotel Sonnenhof" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea id="description" rows={3} {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select id="status" {...register('status')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md">
                <option value="planning">Planung</option>
                <option value="ordered">Material bestellt</option>
                <option value="installation">In Installation</option>
                <option value="completed">Abgeschlossen</option>
                <option value="on_hold">Pausiert</option>
                <option value="cancelled">Storniert</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dealId">Aus Deal (optional)</Label>
              <select id="dealId" {...register('dealId')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md">
                <option value="">— kein Deal —</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}{d.company ? ` — ${d.company.name}` : ''}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Kunde & Bearbeiter</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyId">Firma</Label>
              <select id="companyId" {...register('companyId')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md">
                <option value="">— keine —</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactId">Ansprechpartner</Label>
              <select id="contactId" {...register('contactId')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md">
                <option value="">— keiner —</option>
                {filteredContacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teamMemberId">SCC-Projektleiter</Label>
              <select id="teamMemberId" {...register('teamMemberId')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md">
                <option value="">— keiner —</option>
                {teamMembers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </select>
            </div>
          </div>
          {buildTeams.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="buildTeamId">Bauteam</Label>
              <select id="buildTeamId" {...register('buildTeamId')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md">
                <option value="">— kein Bauteam —</option>
                {buildTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Zeitplan</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="startDate">Start</Label>
            <Input id="startDate" type="date" {...register('startDate')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plannedEndDate">Geplantes Ende</Label>
            <Input id="plannedEndDate" type="date" {...register('plannedEndDate')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="actualEndDate">Tatsächliches Ende</Label>
            <Input id="actualEndDate" type="date" {...register('actualEndDate')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Installations-Ort</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="locationStreet">Straße / Hausnummer</Label>
            <Input id="locationStreet" {...register('locationStreet')} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="locationZip">PLZ</Label>
              <Input id="locationZip" {...register('locationZip')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="locationCity">Stadt</Label>
              <Input id="locationCity" {...register('locationCity')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="locationCountry">Land</Label>
              <Input id="locationCountry" {...register('locationCountry')} placeholder="Deutschland" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notizen</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={4} {...register('notes')} placeholder="Interne Notizen zum Projekt…" />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Speichern…' : 'Speichern'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Abbrechen</Button>
      </div>
    </form>
  )
}
