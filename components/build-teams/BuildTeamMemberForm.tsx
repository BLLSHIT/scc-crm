'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { buildTeamMemberSchema, type BuildTeamMemberInput } from '@/lib/validations/build-team.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ActionResult } from '@/lib/actions/build-teams.actions'

interface Props {
  defaultValues?: Partial<BuildTeamMemberInput>
  onSubmit: (data: BuildTeamMemberInput) => Promise<ActionResult>
  title: string
}

export function BuildTeamMemberForm({ defaultValues, onSubmit, title }: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, watch, handleSubmit, formState: { errors } } = useForm<BuildTeamMemberInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(buildTeamMemberSchema) as any,
    defaultValues: {
      isActive: true,
      isExternal: false,
      sortOrder: 0,
      ...defaultValues,
    },
  })

  const isExternal = watch('isExternal')

  async function submit(data: BuildTeamMemberInput) {
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
      console.error(e); setServerError('Fehler.')
    } finally { setIsPending(false) }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          {serverError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <strong>Fehler:</strong> {serverError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Vorname *</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Nachname *</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role">Rolle</Label>
            <select id="role" {...register('role')}
              className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md">
              <option value="">— bitte wählen —</option>
              <option value="Vorarbeiter">Vorarbeiter</option>
              <option value="Monteur">Monteur</option>
              <option value="Helfer">Helfer</option>
              <option value="Maschinist">Maschinist</option>
              <option value="Elektriker">Elektriker</option>
              <option value="Sonstiges">Sonstiges</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" type="tel" {...register('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <input id="isExternal" type="checkbox" {...register('isExternal')}
                defaultChecked={defaultValues?.isExternal ?? false} />
              <Label htmlFor="isExternal" className="cursor-pointer">
                Externer Subunternehmer
              </Label>
            </div>
            {isExternal && (
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Firma / Subunternehmen</Label>
                <Input id="companyName" {...register('companyName')} />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input id="isActive" type="checkbox" {...register('isActive')}
              defaultChecked={defaultValues?.isActive ?? true} />
            <Label htmlFor="isActive" className="cursor-pointer">Aktiv</Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending}>{isPending ? 'Speichern…' : 'Speichern'}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Abbrechen</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
