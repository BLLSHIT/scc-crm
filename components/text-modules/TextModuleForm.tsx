'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  textModuleSchema,
  type TextModuleInput,
} from '@/lib/validations/text-module.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ActionResult } from '@/lib/actions/text-modules.actions'

interface Props {
  defaultValues?: Partial<TextModuleInput>
  onSubmit: (data: TextModuleInput) => Promise<ActionResult>
  title: string
}

export function TextModuleForm({ defaultValues, onSubmit, title }: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<TextModuleInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(textModuleSchema) as any,
    defaultValues: {
      type: 'other',
      isDefault: false,
      sortOrder: 0,
      ...defaultValues,
    },
  })

  async function submit(data: TextModuleInput) {
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
      console.error('TextModuleForm submit error:', e)
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
              <Label htmlFor="name">Name (intern) *</Label>
              <Input id="name" {...register('name')} placeholder="z.B. Standard-Begrüßung" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Typ *</Label>
              <select
                id="type"
                {...register('type')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
              >
                <option value="greeting">Begrüßung</option>
                <option value="intro">Einleitung</option>
                <option value="footer">Fußzeile</option>
                <option value="payment_terms">Zahlungsbedingungen</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="content">Inhalt *</Label>
            <Textarea
              id="content"
              {...register('content')}
              rows={6}
              placeholder="Sehr geehrte/r {{kunde.anrede}} {{kunde.nachname}},…"
            />
            {errors.content && <p className="text-xs text-red-500">{errors.content.message}</p>}
          </div>

          <div className="rounded-md border border-blue-100 bg-blue-50/50 p-3 space-y-2">
            <p className="text-xs font-semibold text-blue-900">Verfügbare Platzhalter</p>
            <p className="text-xs text-blue-800">
              Werden beim PDF-Erzeugen automatisch ersetzt. Doppelt geschweifte Klammern.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-blue-900">
              <code>{'{{kunde.firma}}'}</code>
              <code>{'{{kunde.anrede}}'}</code>
              <code>{'{{kunde.vorname}}'}</code>
              <code>{'{{kunde.nachname}}'}</code>
              <code>{'{{kunde.email}}'}</code>
              <code>{'{{kunde.adresse}}'}</code>
              <code>{'{{datum}}'}</code>
              <code>{'{{angebot.nummer}}'}</code>
              <code>{'{{angebot.gueltig_bis}}'}</code>
              <code>{'{{rechnung.nummer}}'}</code>
              <code>{'{{rechnung.faellig}}'}</code>
              <code>{'{{scc.name}}'}</code>
              <code>{'{{scc.email}}'}</code>
              <code>{'{{scc.mobil}}'}</code>
              <code>{'{{scc.position}}'}</code>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="sortOrder">Reihenfolge</Label>
              <Input id="sortOrder" type="number" {...register('sortOrder')} />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <input
                id="isDefault"
                type="checkbox"
                {...register('isDefault')}
                defaultChecked={defaultValues?.isDefault ?? false}
              />
              <Label htmlFor="isDefault" className="cursor-pointer">
                Standard (vorausgewählt im Editor)
              </Label>
            </div>
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
