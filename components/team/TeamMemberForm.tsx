'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  teamMemberSchema,
  type TeamMemberInput,
} from '@/lib/validations/team-member.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ActionResult } from '@/lib/actions/team-members.actions'

interface TeamMemberFormProps {
  defaultValues?: Partial<TeamMemberInput>
  onSubmit: (data: TeamMemberInput) => Promise<ActionResult>
  title: string
}

export function TeamMemberForm({ defaultValues, onSubmit, title }: TeamMemberFormProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<TeamMemberInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(teamMemberSchema) as any,
    defaultValues: { isActive: true, ...defaultValues },
  })

  async function submit(data: TeamMemberInput) {
    setServerError(null)
    setIsPending(true)
    try {
      const result = await onSubmit(data)
      if (result.error) {
        const msg =
          result.error._form?.[0] ??
          Object.values(result.error).flat()[0] ??
          'Unbekannter Fehler beim Speichern.'
        setServerError(msg)
      } else if (result.redirectTo) {
        router.push(result.redirectTo)
      }
    } catch (e) {
      console.error('TeamMemberForm submit error:', e)
      setServerError('Ein unerwarteter Fehler ist aufgetreten.')
    } finally {
      setIsPending(false)
    }
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
              {errors.firstName && (
                <p className="text-xs text-red-500">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Nachname *</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && (
                <p className="text-xs text-red-500">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-Mail *</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Mobilnummer</Label>
              <Input id="mobile" type="tel" placeholder="+49 …" {...register('mobile')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="position">Position</Label>
              <Input id="position" placeholder="z.B. Sales Lead" {...register('position')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="abbreviation">Kürzel <span className="text-slate-400 font-normal">(max. 2–3 Zeichen, z.B. JH)</span></Label>
            <Input id="abbreviation" placeholder="JH" maxLength={10} className="w-24 uppercase" {...register('abbreviation')} />
            {errors.abbreviation && (
              <p className="text-xs text-red-500">{errors.abbreviation.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="isActive"
              type="checkbox"
              {...register('isActive')}
              defaultChecked={defaultValues?.isActive ?? true}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Aktiv (im Deal-Dropdown verfügbar)
            </Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Speichern…' : 'Speichern'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
