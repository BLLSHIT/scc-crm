'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { settingsSchema, type SettingsInput } from '@/lib/validations/settings.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ActionResult } from '@/lib/actions/settings.actions'

interface Props {
  defaultValues?: Partial<SettingsInput>
  onSubmit: (data: SettingsInput) => Promise<ActionResult>
}

export function SettingsForm({ defaultValues, onSubmit }: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<SettingsInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(settingsSchema) as any,
    defaultValues,
  })

  async function submit(data: SettingsInput) {
    setServerError(null)
    setSuccess(false)
    setIsPending(true)
    try {
      const result = await onSubmit(data)
      if (result.error) {
        const msg =
          result.error._form?.[0] ??
          Object.values(result.error).flat()[0] ??
          'Unbekannter Fehler beim Speichern.'
        setServerError(msg)
      } else {
        setSuccess(true)
        router.refresh()
      }
    } catch (e) {
      console.error('SettingsForm error:', e)
      setServerError('Ein unerwarteter Fehler ist aufgetreten.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6 max-w-3xl">
      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <strong>Fehler:</strong> {serverError}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          Einstellungen gespeichert.
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Firma (für PDF-Briefkopf)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Firmenname</Label>
            <Input id="companyName" {...register('companyName')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="companyAddress">Straße / Hausnummer</Label>
            <Input id="companyAddress" {...register('companyAddress')} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyZip">PLZ</Label>
              <Input id="companyZip" {...register('companyZip')} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="companyCity">Stadt</Label>
              <Input id="companyCity" {...register('companyCity')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="companyCountry">Land</Label>
            <Input id="companyCountry" {...register('companyCountry')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyEmail">E-Mail</Label>
              <Input id="companyEmail" type="email" {...register('companyEmail')} />
              {errors.companyEmail && <p className="text-xs text-red-500">{errors.companyEmail.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companyPhone">Telefon</Label>
              <Input id="companyPhone" type="tel" {...register('companyPhone')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="companyWebsite">Website</Label>
            <Input id="companyWebsite" placeholder="https://…" {...register('companyWebsite')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="logoUrl">Logo-URL (für PDF, kann später durch Upload ersetzt werden)</Label>
            <Input id="logoUrl" placeholder="https://…/logo.png" {...register('logoUrl')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Steuer + Bank</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="taxNumber">Steuernummer</Label>
              <Input id="taxNumber" {...register('taxNumber')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ustId">USt-IdNr.</Label>
              <Input id="ustId" placeholder="DE…" {...register('ustId')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bankName">Bank</Label>
            <Input id="bankName" {...register('bankName')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bankIban">IBAN</Label>
              <Input id="bankIban" {...register('bankIban')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bankBic">BIC</Label>
              <Input id="bankBic" {...register('bankBic')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Standards für Angebote + Rechnungen</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="defaultQuoteValidity">Angebot gültig (Tage)</Label>
              <Input id="defaultQuoteValidity" type="number" min="1" max="365" {...register('defaultQuoteValidity')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="defaultInvoiceDueDays">Rechnung fällig in (Tagen)</Label>
              <Input id="defaultInvoiceDueDays" type="number" min="0" max="365" {...register('defaultInvoiceDueDays')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="quoteNumberPrefix">Angebots-Präfix</Label>
              <Input id="quoteNumberPrefix" placeholder="AN" {...register('quoteNumberPrefix')} />
              <p className="text-xs text-slate-500">Format: AN-2026-0001</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoiceNumberPrefix">Rechnungs-Präfix</Label>
              <Input id="invoiceNumberPrefix" placeholder="RE" {...register('invoiceNumberPrefix')} />
              <p className="text-xs text-slate-500">Format: RE-2026-0001</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Speichern…' : 'Speichern'}
        </Button>
      </div>
    </form>
  )
}
