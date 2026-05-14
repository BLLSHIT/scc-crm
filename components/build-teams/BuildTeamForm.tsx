'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { buildTeamSchema, type BuildTeamInput } from '@/lib/validations/build-team.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ActionResult } from '@/lib/actions/build-teams.actions'

interface Props {
  defaultValues?: Partial<BuildTeamInput>
  onSubmit: (data: BuildTeamInput) => Promise<ActionResult>
  title: string
}

export function BuildTeamForm({ defaultValues, onSubmit, title }: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<BuildTeamInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(buildTeamSchema) as any,
    defaultValues: {
      maxConcurrentProjects: 2,
      isActive: true,
      ...defaultValues,
    },
  })

  async function submit(data: BuildTeamInput) {
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
          <div className="space-y-1.5">
            <Label htmlFor="name">Bauteam-Name *</Label>
            <Input id="name" {...register('name')} placeholder="z.B. Team Süd" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Beschreibung</Label>
            <Input id="description" {...register('description')} placeholder="Kurze Beschreibung / Spezialgebiet" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxConcurrentProjects">Max. parallele Projekte</Label>
            <Input id="maxConcurrentProjects" type="number" min="1" max="20" {...register('maxConcurrentProjects')} />
            <p className="text-xs text-slate-500">
              Wird überschritten? → Warnung bei Zuweisung. Default: 2.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input id="isActive" type="checkbox" {...register('isActive')}
              defaultChecked={defaultValues?.isActive ?? true} />
            <Label htmlFor="isActive" className="cursor-pointer">
              Aktiv (im Projekt-Dropdown verfügbar)
            </Label>
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
