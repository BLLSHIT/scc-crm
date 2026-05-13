'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { dealSchema, type DealInput } from '@/lib/validations/deal.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import type { ActionResult } from '@/lib/actions/deals.actions'
import { createQuickContact } from '@/lib/actions/contacts.actions'

interface Stage { id: string; name: string; order: number }
interface CompanyOption { id: string; name: string }
interface ContactOption {
  id: string
  firstName: string
  lastName: string
  position?: string | null
  companyId?: string | null
}

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
  const [allContacts, setAllContacts] = useState<ContactOption[]>(contacts)
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(defaultContactIds)
  const sortedStages = [...stages].sort((a, b) => a.order - b.order)

  // Quick-Add state
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [qFirstName, setQFirstName] = useState('')
  const [qLastName, setQLastName] = useState('')
  const [qEmail, setQEmail] = useState('')
  const [qPosition, setQPosition] = useState('')
  const [quickAddPending, setQuickAddPending] = useState(false)
  const [quickAddError, setQuickAddError] = useState<string | null>(null)

  const { register, handleSubmit, control, formState: { errors } } = useForm<DealInput>({
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

  // Reagiert auf Änderung der Firma-Auswahl
  const watchedCompanyId = useWatch({ control, name: 'companyId' }) ?? ''

  // Sichtbare Kontakte: gefiltert nach gewählter Firma
  const visibleContacts = watchedCompanyId
    ? allContacts.filter((c) => c.companyId === watchedCompanyId)
    : []

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

  async function handleQuickAdd() {
    setQuickAddError(null)
    if (!watchedCompanyId) {
      setQuickAddError('Bitte zuerst eine Firma auswählen.')
      return
    }
    if (!qFirstName.trim() || !qLastName.trim()) {
      setQuickAddError('Vor- und Nachname erforderlich.')
      return
    }
    setQuickAddPending(true)
    try {
      const result = await createQuickContact({
        firstName: qFirstName,
        lastName: qLastName,
        email: qEmail,
        position: qPosition,
        companyId: watchedCompanyId,
      })
      if (result.error || !result.contact) {
        setQuickAddError(result.error ?? 'Unbekannter Fehler')
        return
      }
      // Neuen Kontakt in lokale Liste aufnehmen und direkt auswählen
      setAllContacts((prev) => [
        { ...result.contact!, position: result.contact!.position ?? null },
        ...prev,
      ])
      setSelectedContactIds((prev) => [result.contact!.id, ...prev])
      setShowQuickAdd(false)
      setQFirstName('')
      setQLastName('')
      setQEmail('')
      setQPosition('')
    } catch (e) {
      console.error('QuickAdd error:', e)
      setQuickAddError('Ein unerwarteter Fehler ist aufgetreten.')
    } finally {
      setQuickAddPending(false)
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
            <div className="flex items-center justify-between">
              <Label>Ansprechpersonen</Label>
              {watchedCompanyId && !showQuickAdd && (
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Neuen Kontakt anlegen
                </button>
              )}
            </div>

            {!watchedCompanyId ? (
              <p className="text-xs text-slate-500 italic">
                Wähle zuerst eine Firma — Ansprechpersonen werden danach gefiltert.
              </p>
            ) : visibleContacts.length === 0 && !showQuickAdd ? (
              <p className="text-xs text-slate-500 italic">
                Keine Kontakte für diese Firma. Lege oben einen neuen Kontakt an.
              </p>
            ) : (
              <div className="border border-input rounded-md max-h-48 overflow-y-auto divide-y">
                {visibleContacts.map((c) => {
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

            {showQuickAdd && (
              <div className="mt-2 rounded-md border border-blue-200 bg-blue-50/50 p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-900">Neuer Kontakt für diese Firma</p>
                {quickAddError && (
                  <p className="text-xs text-red-600">{quickAddError}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Vorname *"
                    value={qFirstName}
                    onChange={(e) => setQFirstName(e.target.value)}
                  />
                  <Input
                    placeholder="Nachname *"
                    value={qLastName}
                    onChange={(e) => setQLastName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="email"
                    placeholder="E-Mail"
                    value={qEmail}
                    onChange={(e) => setQEmail(e.target.value)}
                  />
                  <Input
                    placeholder="Position"
                    value={qPosition}
                    onChange={(e) => setQPosition(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleQuickAdd}
                    disabled={quickAddPending}
                  >
                    {quickAddPending ? 'Anlegen…' : 'Anlegen & verknüpfen'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowQuickAdd(false)
                      setQuickAddError(null)
                    }}
                  >
                    Abbrechen
                  </Button>
                </div>
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
