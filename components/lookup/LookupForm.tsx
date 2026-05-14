'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { lookupSchema, type LookupInput } from '@/lib/validations/lookup.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ActionResult {
  error?: Record<string, string[]>
  redirectTo?: string
}

interface Props {
  defaultValues?: Partial<LookupInput>
  onSubmit: (data: LookupInput) => Promise<ActionResult>
  title: string
  /** Singular noun for placeholder, z.B. "Branche" oder "Lead-Quelle" */
  nounPlaceholder: string
}

export function LookupForm({ defaultValues, onSubmit, title, nounPlaceholder }: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<LookupInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(lookupSchema) as any,
    defaultValues: { sortOrder: 0, isActive: true, ...defaultValues },
  })

  async function submit(data: LookupInput) {
    setServerError(null)
    setIsPending(true)
    try {
      const result = await onSubmit(data)
      if (result.error) {
        const msg = result.error._form?.[0] ?? Object.values(result.error).flat()[0] ?? 'Fehler.'
        setServerError(msg)
      } else if (result.redirectTo) {
        router.push(result.redirectTo)
      }
    } catch (e) {
      console.error('LookupForm submit', e)
      setServerError('Ein unerwarteter Fehler ist aufgetreten.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          {serverError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <strong>Fehler:</strong> {serverError}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register('name')} placeholder={nounPlaceholder} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sortOrder">Reihenfolge</Label>
            <Input id="sortOrder" type="number" {...register('sortOrder')} />
            <p className="text-xs text-slate-500">Kleinere Zahl = weiter oben</p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              id="isActive"
              type="checkbox"
              {...register('isActive')}
              defaultChecked={defaultValues?.isActive ?? true}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Aktiv (im Dropdown verfügbar)
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
