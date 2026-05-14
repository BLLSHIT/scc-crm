'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { quoteSchema, type QuoteInput } from '@/lib/validations/quote.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Plus,
  PackageOpen,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { calcLine, calcQuoteTotals } from '@/lib/utils/line-items'
import type { ActionResult } from '@/lib/actions/quotes.actions'

interface CompanyOption { id: string; name: string }
interface ContactOption {
  id: string
  firstName: string
  lastName: string
  position?: string | null
  companyId?: string | null
}
interface TeamMemberOption {
  id: string
  firstName: string
  lastName: string
  position?: string | null
}
interface ProductOption {
  id: string
  name: string
  description?: string | null
  unit: string
  defaultPriceNet: number | string
  defaultVatRate: number | string
  imageUrl?: string | null
}
interface TextModuleOption {
  id: string
  name: string
  type: 'greeting' | 'intro' | 'footer' | 'payment_terms' | 'other'
  content: string
  isDefault: boolean
}

interface Props {
  defaultValues?: Partial<QuoteInput>
  onSubmit: (data: QuoteInput) => Promise<ActionResult>
  title: string
  companies: CompanyOption[]
  contacts: ContactOption[]
  teamMembers: TeamMemberOption[]
  products: ProductOption[]
  textModules: TextModuleOption[]
}

export function QuoteForm({
  defaultValues,
  onSubmit,
  title,
  companies,
  contacts,
  teamMembers,
  products,
  textModules,
}: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Default-Textbausteine bei neuem Angebot vorbelegen
  const defaultGreeting = useMemo(
    () => textModules.find((m) => m.type === 'greeting' && m.isDefault)?.content ?? '',
    [textModules]
  )
  const defaultIntro = useMemo(
    () => textModules.find((m) => m.type === 'intro' && m.isDefault)?.content ?? '',
    [textModules]
  )
  const defaultFooter = useMemo(
    () => textModules.find((m) => m.type === 'footer' && m.isDefault)?.content ?? '',
    [textModules]
  )
  const defaultPayment = useMemo(
    () => textModules.find((m) => m.type === 'payment_terms' && m.isDefault)?.content ?? '',
    [textModules]
  )

  const { register, control, handleSubmit, setValue, formState: { errors } } =
    useForm<QuoteInput>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(quoteSchema) as any,
      defaultValues: {
        title: '',
        validUntil: '',
        companyId: '',
        contactId: '',
        teamMemberId: '',
        dealId: '',
        greeting: defaultGreeting,
        intro: defaultIntro,
        footer: defaultFooter,
        paymentTerms: defaultPayment,
        lineItems: [],
        ...defaultValues,
      },
    })

  const { fields, append, remove, swap } = useFieldArray({ control, name: 'lineItems' })

  // Reagiere auf Company-Auswahl → filtere Contact-Optionen
  const watchedCompanyId = useWatch({ control, name: 'companyId' }) ?? ''
  const filteredContacts = watchedCompanyId
    ? contacts.filter((c) => c.companyId === watchedCompanyId)
    : contacts

  // Live-Totals
  const watchedItems = useWatch({ control, name: 'lineItems' }) ?? []
  const totals = calcQuoteTotals(
    watchedItems.map((it) => ({
      quantity: Number(it.quantity) || 0,
      unitPriceNet: Number(it.unitPriceNet) || 0,
      discountPercent: Number(it.discountPercent) || 0,
      vatRate: Number(it.vatRate) || 0,
      isOptional: Boolean(it.isOptional),
    }))
  )

  // Produkt aus Katalog hinzufügen
  function addFromProduct(productId: string) {
    if (!productId) return
    const p = products.find((x) => x.id === productId)
    if (!p) return
    append({
      productId: p.id,
      name: p.name,
      description: p.description ?? '',
      imageUrl: p.imageUrl ?? '',
      unit: p.unit,
      quantity: 1,
      unitPriceNet: Number(p.defaultPriceNet) || 0,
      discountPercent: 0,
      vatRate: Number(p.defaultVatRate) || 19,
      isOptional: false,
      sortOrder: fields.length,
    })
  }

  function addFreeItem() {
    append({
      name: '',
      description: '',
      imageUrl: '',
      unit: 'Stück',
      quantity: 1,
      unitPriceNet: 0,
      discountPercent: 0,
      vatRate: 19,
      isOptional: false,
      sortOrder: fields.length,
    })
  }

  function modulesOfType(type: TextModuleOption['type']) {
    return textModules
      .filter((m) => m.type === type)
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
  }

  async function submit(data: QuoteInput) {
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
      console.error('QuoteForm submit error:', e)
      setServerError('Ein unerwarteter Fehler ist aufgetreten.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6 max-w-5xl">
      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <strong>Fehler:</strong> {serverError}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="title">Titel *</Label>
              <Input id="title" {...register('title')} placeholder="z.B. Padel-Anlage München-Süd" />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="validUntil">Gültig bis *</Label>
              <Input id="validUntil" type="date" {...register('validUntil')} />
              {errors.validUntil && <p className="text-xs text-red-500">{errors.validUntil.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyId">Empfänger-Firma</Label>
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
              <Label htmlFor="contactId">Ansprechpartner</Label>
              <select
                id="contactId"
                {...register('contactId')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
              >
                <option value="">— kein Kontakt —</option>
                {filteredContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}{c.position ? ` — ${c.position}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teamMemberId">SCC-Bearbeiter</Label>
              <select
                id="teamMemberId"
                {...register('teamMemberId')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
              >
                <option value="">— keiner —</option>
                {teamMembers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <input type="hidden" {...register('dealId')} />
        </CardContent>
      </Card>

      {/* Texte mit Textbaustein-Picker */}
      <Card>
        <CardHeader><CardTitle>Texte</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <TextBlockField
            id="greeting"
            label="Begrüßung"
            register={register}
            setValue={setValue}
            field="greeting"
            modules={modulesOfType('greeting')}
            placeholder="Sehr geehrte/r…"
          />
          <TextBlockField
            id="intro"
            label="Einleitung"
            register={register}
            setValue={setValue}
            field="intro"
            modules={modulesOfType('intro')}
            placeholder="vielen Dank für Ihre Anfrage…"
            rows={4}
          />
          <TextBlockField
            id="paymentTerms"
            label="Zahlungsbedingungen"
            register={register}
            setValue={setValue}
            field="paymentTerms"
            modules={modulesOfType('payment_terms')}
            placeholder="Zahlungsziel: 14 Tage netto…"
          />
          <TextBlockField
            id="footer"
            label="Fußzeile"
            register={register}
            setValue={setValue}
            field="footer"
            modules={modulesOfType('footer')}
            placeholder="Wir freuen uns auf Ihre Rückmeldung…"
          />
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Positionen ({fields.length})</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                defaultValue=""
                onChange={(e) => {
                  addFromProduct(e.target.value)
                  e.currentTarget.value = ''
                }}
                className="border border-input bg-background px-3 py-1.5 text-sm rounded-md max-w-xs"
              >
                <option value="" disabled>
                  + Aus Produkt-Katalog hinzufügen…
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({Number(p.defaultPriceNet).toLocaleString('de-DE')} €)
                  </option>
                ))}
              </select>
              <Button type="button" size="sm" variant="outline" onClick={addFreeItem}>
                <Plus className="w-4 h-4 mr-1" />
                Freie Position
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {fields.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">
              <PackageOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              Keine Positionen. Füge oben Produkte aus dem Katalog oder freie Positionen hinzu.
            </div>
          ) : (
            <div className="divide-y">
              {fields.map((field, idx) => (
                <LineItemRow
                  key={field.id}
                  index={idx}
                  total={fields.length}
                  register={register}
                  control={control}
                  onUp={() => idx > 0 && swap(idx, idx - 1)}
                  onDown={() => idx < fields.length - 1 && swap(idx, idx + 1)}
                  onRemove={() => remove(idx)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Totals */}
      <Card>
        <CardContent className="p-5">
          <div className="max-w-sm ml-auto space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Zwischensumme netto</span>
              <span>{formatCurrency(totals.subtotalNet, 'EUR')}</span>
            </div>
            {totals.totalDiscount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>− Rabatt</span>
                <span>{formatCurrency(totals.totalDiscount, 'EUR')}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>MwSt</span>
              <span>{formatCurrency(totals.totalVat, 'EUR')}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-2 mt-2 border-t text-slate-900">
              <span>Gesamtsumme brutto</span>
              <span>{formatCurrency(totals.totalGross, 'EUR')}</span>
            </div>
            {watchedItems.some((i: any) => i.isOptional) && (
              <p className="text-xs text-amber-700 italic mt-3">
                Optionale Positionen sind nicht in der Summe enthalten.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Speichern…' : 'Speichern'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Abbrechen
        </Button>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────
//  Untergeordnete Komponenten
// ─────────────────────────────────────────────────────────────────────

function TextBlockField({
  id,
  label,
  register,
  setValue,
  field,
  modules,
  placeholder,
  rows = 3,
}: {
  id: string
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: any
  field: 'greeting' | 'intro' | 'footer' | 'paymentTerms'
  modules: TextModuleOption[]
  placeholder?: string
  rows?: number
}) {
  function applyModule(content: string) {
    setValue(field, content, { shouldDirty: true })
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {modules.length > 0 && (
          <select
            defaultValue=""
            onChange={(e) => {
              const mod = modules.find((m) => m.id === e.target.value)
              if (mod) applyModule(mod.content)
              e.currentTarget.value = ''
            }}
            className="text-xs border border-input bg-background px-2 py-1 rounded-md"
          >
            <option value="" disabled>
              <Sparkles className="inline w-3 h-3 mr-1" />
              Textbaustein einfügen…
            </option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.isDefault ? '★ ' : ''}{m.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <Textarea id={id} {...register(field)} rows={rows} placeholder={placeholder} />
    </div>
  )
}

function LineItemRow({
  index,
  total,
  register,
  control,
  onUp,
  onDown,
  onRemove,
}: {
  index: number
  total: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any
  onUp: () => void
  onDown: () => void
  onRemove: () => void
}) {
  // Watch the row for live preview of net total
  const item = useWatch({ control, name: `lineItems.${index}` }) ?? {}
  const calc = calcLine({
    quantity: Number(item.quantity) || 0,
    unitPriceNet: Number(item.unitPriceNet) || 0,
    discountPercent: Number(item.discountPercent) || 0,
    vatRate: Number(item.vatRate) || 0,
    isOptional: Boolean(item.isOptional),
  })

  return (
    <div className={`p-4 space-y-3 ${item.isOptional ? 'bg-amber-50/40' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-0.5 pt-1">
          <span className="text-xs text-slate-400 font-medium">{index + 1}</span>
          <button
            type="button"
            onClick={onUp}
            disabled={index === 0}
            className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
            title="Nach oben"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onDown}
            disabled={index === total - 1}
            className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
            title="Nach unten"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <div className="flex-1 space-y-2">
          <input type="hidden" {...register(`lineItems.${index}.productId`)} />
          <input type="hidden" {...register(`lineItems.${index}.imageUrl`)} />
          <input type="hidden" {...register(`lineItems.${index}.sortOrder`)} value={index} />

          <Input
            placeholder="Bezeichnung *"
            {...register(`lineItems.${index}.name`)}
          />
          <Textarea
            placeholder="Beschreibung (optional)"
            rows={2}
            {...register(`lineItems.${index}.description`)}
          />

          <div className="grid grid-cols-6 gap-2">
            <div>
              <Label className="text-xs">Menge</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register(`lineItems.${index}.quantity`)}
              />
            </div>
            <div>
              <Label className="text-xs">Einheit</Label>
              <select
                {...register(`lineItems.${index}.unit`)}
                className="w-full border border-input bg-background px-2 py-2 text-sm rounded-md"
              >
                <option value="Stück">Stück</option>
                <option value="m²">m²</option>
                <option value="m">m</option>
                <option value="Std.">Std.</option>
                <option value="Tag">Tag</option>
                <option value="Pauschal">Pauschal</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Einzel netto €</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register(`lineItems.${index}.unitPriceNet`)}
              />
            </div>
            <div>
              <Label className="text-xs">Rabatt %</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register(`lineItems.${index}.discountPercent`)}
              />
            </div>
            <div>
              <Label className="text-xs">MwSt %</Label>
              <select
                {...register(`lineItems.${index}.vatRate`)}
                className="w-full border border-input bg-background px-2 py-2 text-sm rounded-md"
              >
                <option value="19">19%</option>
                <option value="7">7%</option>
                <option value="0">0%</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Netto-Summe</Label>
              <div className="px-2 py-2 text-sm bg-slate-50 border rounded-md font-medium text-right">
                {formatCurrency(calc.net, 'EUR')}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Controller
              control={control}
              name={`lineItems.${index}.isOptional`}
              render={({ field }) => (
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  <span className="text-amber-700">
                    Optionale Position (nicht in Summe)
                  </span>
                </label>
              )}
            />
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Position entfernen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
