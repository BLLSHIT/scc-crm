'use client'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { dealSchema, type DealInput } from '@/lib/validations/deal.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Stage { id: string; name: string; order: number }

interface DealFormProps {
  defaultValues?: Partial<DealInput>
  onSubmit: (data: DealInput) => Promise<{ error?: Record<string, string[]> } | void>
  title: string
  pipelineId: string
  stages: Stage[]
}

export function DealForm({ defaultValues, onSubmit, title, pipelineId, stages }: DealFormProps) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
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

  function submit(data: DealInput) {
    setServerError(null)
    startTransition(async () => {
      const result = await onSubmit(data)
      if (result?.error) {
        const msg =
          result.error._form?.[0] ??
          Object.values(result.error).flat()[0] ??
          'Unbekannter Fehler'
        setServerError(msg)
      }
    })
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
            <Button type="button" variant="outline" onClick={() => history.back()}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
