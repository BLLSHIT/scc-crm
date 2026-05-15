'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { companySchema, type CompanyInput } from '@/lib/validations/company.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ActionResult } from '@/lib/actions/companies.actions'

interface IndustryOption { id: string; name: string }

interface CompanyFormProps {
  defaultValues?: Partial<CompanyInput>
  onSubmit: (data: CompanyInput) => Promise<ActionResult>
  title: string
  industries?: IndustryOption[]
}

export function CompanyForm({ defaultValues, onSubmit, title, industries = [] }: CompanyFormProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(companySchema) as any,
    defaultValues: { tags: [], ...defaultValues },
  })

  async function submit(data: CompanyInput) {
    // Auto-prepend https:// if the user typed a URL without a protocol
    if (data.website && !/^https?:\/\//i.test(data.website)) {
      data.website = `https://${data.website}`
    }
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
      console.error('CompanyForm submit error:', e)
      setServerError('Ein unerwarteter Fehler ist aufgetreten.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          {serverError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <strong>Fehler:</strong> {serverError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name">Firmenname *</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="industry">Branche</Label>
              <select
                id="industry"
                {...register('industry')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
              >
                <option value="">— bitte wählen —</option>
                {industries.map((o) => (
                  <option key={o.id} value={o.name}>{o.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tier">Kunden-Tier</Label>
              <select
                id="tier"
                {...register('tier')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
              >
                <option value="">— Standard —</option>
                <option value="premium">⭐ Premium</option>
                <option value="key_account">🔑 Key Account</option>
                <option value="standard">Standard</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="size">Größe</Label>
              <Input id="size" {...register('size')} placeholder="z.B. 10-50" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" {...register('website')} placeholder="z.B. example.com" />
            {errors.website && (
              <p className="text-xs text-red-500">{errors.website.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" type="tel" {...register('phone')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                placeholder="linkedin.com/company/firma"
                {...register('linkedin')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                placeholder="@firma"
                {...register('instagram')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city">Stadt</Label>
              <Input id="city" {...register('city')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Land</Label>
              <Input id="country" {...register('country')} />
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
