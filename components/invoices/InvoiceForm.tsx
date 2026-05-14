'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { invoiceSchema, type InvoiceInput } from '@/lib/validations/invoice.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, PackageOpen, Trash2, ChevronUp, ChevronDown, AlignLeft } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { calcLine, calcQuoteTotals } from '@/lib/utils/line-items'
import { ProductPickerDrawer, type PickedProduct } from '@/components/quotes/ProductPickerDrawer'
import type { ActionResult } from '@/lib/actions/invoices.actions'

interface CompanyOption { id: string; name: string }
interface ContactOption { id: string; firstName: string; lastName: string; position?: string | null; companyId?: string | null }
interface TeamMemberOption { id: string; firstName: string; lastName: string; position?: string | null }
interface ProductOption {
  id: string; name: string; description?: string | null; category?: string | null
  unit: string; defaultPriceNet: number | string; defaultVatRate: number | string; imageUrl?: string | null
}
interface TextModuleOption {
  id: string; name: string
  type: 'greeting' | 'intro' | 'footer' | 'payment_terms' | 'other'
  content: string; isDefault: boolean
}
interface DealOption { id: string; title: string; company?: { id: string; name: string } | null }

interface Props {
  defaultValues?: Partial<InvoiceInput>
  onSubmit: (data: InvoiceInput) => Promise<ActionResult>
  title: string
  companies: CompanyOption[]
  contacts: ContactOption[]
  teamMembers: TeamMemberOption[]
  products: ProductOption[]
  textModules: TextModuleOption[]
  deals?: DealOption[]
}

export function InvoiceForm({
  defaultValues, onSubmit, title,
  companies, contacts, teamMembers, products, textModules, deals = [],
}: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const defaultGreeting  = useMemo(() => textModules.find((m) => m.type === 'greeting'      && m.isDefault)?.content ?? '', [textModules])
  const defaultIntro     = useMemo(() => textModules.find((m) => m.type === 'intro'         && m.isDefault)?.content ?? '', [textModules])
  const defaultFooter    = useMemo(() => textModules.find((m) => m.type === 'footer'        && m.isDefault)?.content ?? '', [textModules])
  const defaultPayment   = useMemo(() => textModules.find((m) => m.type === 'payment_terms' && m.isDefault)?.content ?? '', [textModules])

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      title: '',
      issueDate: '',
      dueDate: '',
      companyId: '', contactId: '', teamMemberId: '', dealId: '', quoteId: '',
      greeting: defaultGreeting, intro: defaultIntro, footer: defaultFooter, paymentTerms: defaultPayment,
      globalDiscountPercent: 0, lineItems: [],
      ...defaultValues,
    },
  })
  const { fields, append, remove, swap } = useFieldArray({ control, name: 'lineItems' })

  const watchedCompanyId = useWatch({ control, name: 'companyId' }) ?? ''
  const filteredContacts = watchedCompanyId
    ? contacts.filter((c) => c.companyId === watchedCompanyId)
    : contacts

  const watchedItems = useWatch({ control, name: 'lineItems' }) ?? []
  const watchedGlobalDiscount = Number(useWatch({ control, name: 'globalDiscountPercent' }) ?? 0)
  const totals = calcQuoteTotals(
    watchedItems.map((it: any) => ({
      itemType: it.itemType,
      quantity: Number(it.quantity) || 0,
      unitPriceNet: Number(it.unitPriceNet) || 0,
      discountPercent: Number(it.discountPercent) || 0,
      vatRate: Number(it.vatRate) || 0,
      isOptional: Boolean(it.isOptional),
    })),
    watchedGlobalDiscount
  )

  function addPickedProducts(picked: PickedProduct[]) {
    const base = fields.length
    const rows = picked.map((p, i) => ({
      itemType: 'product' as const,
      productId: p.productId, name: p.name, description: p.description, imageUrl: p.imageUrl,
      unit: p.unit, quantity: p.quantity, unitPriceNet: p.unitPriceNet,
      discountPercent: 0, vatRate: p.defaultVatRate, isOptional: false, sortOrder: base + i,
    }))
    append(rows)
  }
  function addFreeItem() {
    append({
      itemType: 'product', name: '', description: '', imageUrl: '',
      unit: 'Stück', quantity: 1, unitPriceNet: 0, discountPercent: 0, vatRate: 19,
      isOptional: false, sortOrder: fields.length,
    })
  }
  function addTextLine() {
    append({
      itemType: 'text', name: '', description: '', imageUrl: '',
      unit: 'Stück', quantity: 0, unitPriceNet: 0, discountPercent: 0, vatRate: 0,
      isOptional: false, sortOrder: fields.length,
    })
  }
  function modulesOfType(type: TextModuleOption['type']) {
    return textModules.filter((m) => m.type === type).sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
  }

  async function submit(data: InvoiceInput) {
    setServerError(null); setIsPending(true)
    try {
      const result = await onSubmit(data)
      if (result.error) {
        const msg = result.error._form?.[0] ?? Object.values(result.error).flat()[0] ?? 'Fehler beim Speichern.'
        setServerError(msg)
      } else if (result.redirectTo) {
        router.push(result.redirectTo)
      }
    } catch (e) {
      console.error('InvoiceForm submit', e)
      setServerError('Ein unerwarteter Fehler ist aufgetreten.')
    } finally { setIsPending(false) }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <strong>Fehler:</strong> {serverError}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="title">Titel *</Label>
              <Input id="title" {...register('title')} placeholder="z.B. Padel-Court Installation" />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issueDate">Rechnungsdatum *</Label>
              <Input id="issueDate" type="date" {...register('issueDate')} />
              {errors.issueDate && <p className="text-xs text-red-500">{errors.issueDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Fällig am *</Label>
              <Input id="dueDate" type="date" {...register('dueDate')} />
              {errors.dueDate && <p className="text-xs text-red-500">{errors.dueDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyId">Empfänger-Firma</Label>
              <select id="companyId" {...register('companyId')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md">
                <option value="">— keine —</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactId">Ansprechpartner</Label>
              <select id="contactId" {...register('contactId')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md">
                <option value="">— keiner —</option>
                {filteredContacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.position ? ` — ${c.position}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teamMemberId">SCC-Bearbeiter</Label>
              <select id="teamMemberId" {...register('teamMemberId')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md">
                <option value="">— keiner —</option>
                {teamMembers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dealId">Verknüpfter Deal (optional)</Label>
            <select id="dealId" {...register('dealId')}
              className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md">
              <option value="">— kein Deal —</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>{d.title}{d.company ? ` — ${d.company.name}` : ''}</option>
              ))}
            </select>
          </div>
          <input type="hidden" {...register('quoteId')} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle>Positionen ({fields.length})</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button type="button" size="sm" onClick={() => setDrawerOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />Aus Katalog
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={addFreeItem}>
                    <Plus className="w-4 h-4 mr-1" />Freie Position
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={addTextLine}>
                    <AlignLeft className="w-4 h-4 mr-1" />Freitextzeile
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {fields.length === 0 ? (
                <div className="px-5 py-10 text-center text-slate-400 text-sm">
                  <PackageOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Noch keine Positionen.
                </div>
              ) : (
                <div className="divide-y">
                  {fields.map((field, idx) => (
                    <LineItemRow key={field.id} index={idx} total={fields.length}
                      register={register} control={control}
                      onUp={() => idx > 0 && swap(idx, idx - 1)}
                      onDown={() => idx < fields.length - 1 && swap(idx, idx + 1)}
                      onRemove={() => remove(idx)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="max-w-md ml-auto space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="globalDiscountPercent" className="font-normal text-slate-600">Gesamtrabatt (%)</Label>
                  <div className="w-28">
                    <Input id="globalDiscountPercent" type="number" step="0.01" min="0" max="100"
                      {...register('globalDiscountPercent')} className="text-right" />
                  </div>
                </div>
                <div className="pt-3 border-t space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Zwischensumme netto</span>
                    <span>{formatCurrency(totals.subtotalNet, 'EUR')}</span>
                  </div>
                  {totals.totalDiscount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>− Positions-Rabatte</span>
                      <span>{formatCurrency(totals.totalDiscount, 'EUR')}</span>
                    </div>
                  )}
                  {totals.globalDiscountAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>− Gesamtrabatt ({Number(watchedGlobalDiscount)}%)</span>
                      <span>{formatCurrency(totals.globalDiscountAmount, 'EUR')}</span>
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
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Texte</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <TextBlockField id="greeting" label="Begrüßung" register={register} setValue={setValue}
                field="greeting" modules={modulesOfType('greeting')} placeholder="Sehr geehrte/r…" rows={2} />
              <TextBlockField id="intro" label="Einleitung" register={register} setValue={setValue}
                field="intro" modules={modulesOfType('intro')} placeholder="für unsere Leistung berechnen wir Ihnen folgende Positionen…" rows={4} />
              <TextBlockField id="paymentTerms" label="Zahlungsbedingungen" register={register} setValue={setValue}
                field="paymentTerms" modules={modulesOfType('payment_terms')}
                placeholder="Bitte überweisen Sie den Rechnungsbetrag innerhalb von 14 Tagen…" rows={3} />
              <TextBlockField id="footer" label="Fußzeile" register={register} setValue={setValue}
                field="footer" modules={modulesOfType('footer')} placeholder="Vielen Dank für Ihren Auftrag." rows={2} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>{isPending ? 'Speichern…' : 'Speichern'}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Abbrechen</Button>
      </div>

      <ProductPickerDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
        products={products} onAdd={addPickedProducts} />
    </form>
  )
}

function TextBlockField({
  id, label, register, setValue, field, modules, placeholder, rows = 3,
}: {
  id: string; label: string
  register: any; setValue: any
  field: 'greeting' | 'intro' | 'footer' | 'paymentTerms'
  modules: TextModuleOption[]; placeholder?: string; rows?: number
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {modules.length > 0 && (
          <select defaultValue=""
            onChange={(e) => {
              const mod = modules.find((m) => m.id === e.target.value)
              if (mod) setValue(field, mod.content, { shouldDirty: true })
              e.currentTarget.value = ''
            }}
            className="text-xs border border-input bg-background px-2 py-1 rounded-md">
            <option value="" disabled>+ Baustein…</option>
            {modules.map((m) => <option key={m.id} value={m.id}>{m.isDefault ? '★ ' : ''}{m.name}</option>)}
          </select>
        )}
      </div>
      <Textarea id={id} {...register(field)} rows={rows} placeholder={placeholder} />
    </div>
  )
}

function LineItemRow({
  index, total, register, control, onUp, onDown, onRemove,
}: {
  index: number; total: number
  register: any; control: any
  onUp: () => void; onDown: () => void; onRemove: () => void
}) {
  const item = useWatch({ control, name: `lineItems.${index}` }) ?? {}
  const isText = item.itemType === 'text'
  const calc = calcLine({
    itemType: item.itemType,
    quantity: Number(item.quantity) || 0,
    unitPriceNet: Number(item.unitPriceNet) || 0,
    discountPercent: Number(item.discountPercent) || 0,
    vatRate: Number(item.vatRate) || 0,
    isOptional: Boolean(item.isOptional),
  })

  return (
    <div className={`p-4 ${isText ? 'bg-slate-50/70' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-0.5 pt-1">
          <span className="text-xs text-slate-400 font-medium">{index + 1}</span>
          <button type="button" onClick={onUp} disabled={index === 0}
            className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30" title="Nach oben">
            <ChevronUp className="w-3 h-3" />
          </button>
          <button type="button" onClick={onDown} disabled={index === total - 1}
            className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30" title="Nach unten">
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          <input type="hidden" {...register(`lineItems.${index}.itemType`)} />
          <input type="hidden" {...register(`lineItems.${index}.productId`)} />
          <input type="hidden" {...register(`lineItems.${index}.imageUrl`)} />
          <input type="hidden" {...register(`lineItems.${index}.sortOrder`)} />

          {isText ? (
            <>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <AlignLeft className="w-3 h-3" />Freitextzeile (keine Berechnung)
              </div>
              <Textarea placeholder="Text…" rows={2} {...register(`lineItems.${index}.name`)} />
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.name || 'Produkt'}
                    className="w-12 h-12 object-cover rounded border bg-slate-50 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <Input placeholder="Bezeichnung *" {...register(`lineItems.${index}.name`)} />
                </div>
              </div>
              <Textarea placeholder="Beschreibung (optional)" rows={2} {...register(`lineItems.${index}.description`)} />
              <div className="grid grid-cols-6 gap-2">
                <div>
                  <Label className="text-xs">Menge</Label>
                  <Input type="number" step="0.01" min="0" {...register(`lineItems.${index}.quantity`)} />
                </div>
                <div>
                  <Label className="text-xs">Einheit</Label>
                  <select {...register(`lineItems.${index}.unit`)}
                    className="w-full border border-input bg-background px-2 py-2 text-sm rounded-md">
                    <option value="Stück">Stück</option><option value="m²">m²</option>
                    <option value="m">m</option><option value="Std.">Std.</option>
                    <option value="Tag">Tag</option><option value="Pauschal">Pauschal</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Einzel netto €</Label>
                  <Input type="number" step="0.01" min="0" {...register(`lineItems.${index}.unitPriceNet`)} />
                </div>
                <div>
                  <Label className="text-xs">Rabatt %</Label>
                  <Input type="number" step="0.01" min="0" max="100" {...register(`lineItems.${index}.discountPercent`)} />
                </div>
                <div>
                  <Label className="text-xs">MwSt %</Label>
                  <select {...register(`lineItems.${index}.vatRate`)}
                    className="w-full border border-input bg-background px-2 py-2 text-sm rounded-md">
                    <option value="19">19%</option><option value="7">7%</option><option value="0">0%</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Netto-Summe</Label>
                  <div className="px-2 py-2 text-sm bg-white border rounded-md font-medium text-right">
                    {formatCurrency(calc.net, 'EUR')}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-1">
            <span />
            <button type="button" onClick={onRemove}
              className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1">
              <Trash2 className="w-3 h-3" />Entfernen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
