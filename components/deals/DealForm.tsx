'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { dealSchema, type DealInput } from '@/lib/validations/deal.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ActionResult } from '@/lib/actions/deals.actions'

interface Stage { id: string; name: string; order: number }
interface CompanyOption { id: string; name: string }
interface ContactOption { id: string; firstName: string; lastName: string; position?: string | null }

interface DealFormProps {
  defaultValues?: Partial<DealInput>
  defaultContactIds?: string[]
  onSubmit: (data: DealInput, contactIds: string[]) => Promise<ActionResult>
  title: string
  pipelineId: string
  stages: Stage[]
  companies?: CompanyOption[]
  contacts?: ContactOption[]
}

export function DealForm({
  defaultValues,
  defaultContactIds = [],
  onSubmit,
  title,
  pipelineId,
  stages,
  companies = [],
  contacts = [],
}: DealFormProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(defaultContactIds)
  const sortedStages = [...stages].sort((a, b) => a.order - b.order)

  const { register, handleSubmit, formState: { errors } } = useForm<DealInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(dealSchema) as any,
    defaultValues: {
      currency: 'EUR',
      probability: 0,
      pipelineId,
      stageId: sortedStages[0]?.id ?? '',
      ...defaultValues,
    },
  })

  function toggleContact(id: string) {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function submit(data: DealInput) {
    setServerError(null)
    setIsPending(true)
    try {
      const result = await onSubmit(data, selectedContactIds)
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
      console.error('DealForm submit error:', e)
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
          <input type="hidden" {...register('pipelineId')} />

          {serverError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <strong>Fehler:</strong> {serverError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title">Titel *</Label>
            <Input id="title" {...register('title')} placeholder="z.B. Padel Court Anlage München" />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="value">Wert (€)</Label>
              <Input id="value" type="number" step="0.01" {...register('value')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="probability">Wahrscheinlichkeit (%)</Label>
              <Input id="probability" type="number" min="0" max="100" {...register('probability')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stageId">Phase</Label>
            <select
              id="stageId"
              {...register('stageId')}
              className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
            >
              {sortedStages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="companyId">Firma</Label>
            <select
              id="companyId"
              {...register('companyId')}
              className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
            >
              <option value="">— keine Firma —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Ansprechpersonen</Label>
            {contacts.length === 0 ? (
              <p className="text-xs text-slate-500">
                Noch keine Kontakte. Lege zuerst Kontakte an, um sie hier zu verknüpfen.
              </p>
            ) : (
              <div className="border border-input rounded-md max-h-48 overflow-y-auto divide-y">
                {contacts.map((c) => {
                  const checked = selectedContactIds.includes(c.id)
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleContact(c.id)}
                      />
                      <span className="font-medium">{c.firstName} {c.lastName}</span>
                      {c.position && <span className="text-slate-500">— {c.position}</span>}
                    </label>
                  )
                })}
              </div>
            )}
            {selectedContactIds.length > 0 && (
              <p className="text-xs text-slate-500">
                {selectedContactIds.length} Person(en) ausgewählt
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expectedCloseAt">Erwarteter Abschluss</Label>
            <Input id="expectedCloseAt" type="date" {...register('expectedCloseAt')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea id="description" {...register('description')} rows={3} />
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
