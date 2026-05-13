'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { taskSchema, type TaskInput } from '@/lib/validations/task.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ActionResult } from '@/lib/actions/tasks.actions'

interface Option { id: string; label: string }

interface TaskFormProps {
  defaultValues?: Partial<TaskInput>
  onSubmit: (data: TaskInput) => Promise<ActionResult>
  title: string
  deals?: Option[]
  contacts?: Option[]
  companies?: Option[]
}

export function TaskForm({
  defaultValues,
  onSubmit,
  title,
  deals = [],
  contacts = [],
  companies = [],
}: TaskFormProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<TaskInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(taskSchema) as any,
    defaultValues: {
      status: 'open',
      priority: 'medium',
      ...defaultValues,
    },
  })

  async function submit(data: TaskInput) {
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
      console.error('TaskForm submit error:', e)
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

          <div className="space-y-1.5">
            <Label htmlFor="title">Titel *</Label>
            <Input id="title" {...register('title')} placeholder="z.B. Angebot nachfassen" />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea id="description" {...register('description')} rows={3} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                {...register('status')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
              >
                <option value="open">Offen</option>
                <option value="in_progress">In Bearbeitung</option>
                <option value="done">Erledigt</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priorität</Label>
              <select
                id="priority"
                {...register('priority')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
              >
                <option value="low">Niedrig</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Fällig am</Label>
              <Input id="dueDate" type="date" {...register('dueDate')} />
            </div>
          </div>

          {(deals.length > 0 || contacts.length > 0 || companies.length > 0) && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Verknüpfung (optional)
              </p>
              {deals.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="dealId">Deal</Label>
                  <select
                    id="dealId"
                    {...register('dealId')}
                    className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
                  >
                    <option value="">— kein Deal —</option>
                    {deals.map((d) => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {contacts.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="contactId">Kontakt</Label>
                  <select
                    id="contactId"
                    {...register('contactId')}
                    className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
                  >
                    <option value="">— kein Kontakt —</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {companies.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="companyId">Firma</Label>
                  <select
                    id="companyId"
                    {...register('companyId')}
                    className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
                  >
                    <option value="">— keine Firma —</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

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
