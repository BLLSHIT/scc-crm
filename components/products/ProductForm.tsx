'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductInput } from '@/lib/validations/product.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ActionResult } from '@/lib/actions/products.actions'

interface Props {
  defaultValues?: Partial<ProductInput>
  onSubmit: (data: ProductInput) => Promise<ActionResult>
  title: string
}

export function ProductForm({ defaultValues, onSubmit, title }: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ProductInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      unit: 'Stück',
      defaultVatRate: 19,
      defaultPriceNet: 0,
      isActive: true,
      ...defaultValues,
    },
  })

  const imageUrl = watch('imageUrl')

  async function submit(data: ProductInput) {
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
      console.error('ProductForm submit error:', e)
      setServerError('Ein unerwarteter Fehler ist aufgetreten.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card className="max-w-3xl">
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
            <Input id="name" {...register('name')} placeholder="z.B. Padel Court Pro" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea id="description" {...register('description')} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU / Artikelnummer</Label>
              <Input id="sku" {...register('sku')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Kategorie</Label>
              <Input id="category" {...register('category')} placeholder="z.B. Court, Zubehör" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="unit">Einheit</Label>
              <select
                id="unit"
                {...register('unit')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
              >
                <option value="Stück">Stück</option>
                <option value="m²">m²</option>
                <option value="m">m</option>
                <option value="Std.">Stunde</option>
                <option value="Tag">Tag</option>
                <option value="Pauschal">Pauschal</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="defaultPriceNet">Nettopreis (€) *</Label>
              <Input
                id="defaultPriceNet"
                type="number"
                step="0.01"
                min="0"
                {...register('defaultPriceNet')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="defaultVatRate">MwSt-Satz *</Label>
              <select
                id="defaultVatRate"
                {...register('defaultVatRate')}
                className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
              >
                <option value="19">19% (Standard)</option>
                <option value="7">7% (ermäßigt)</option>
                <option value="0">0% (steuerfrei)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="imageUrl">Produktbild (URL)</Label>
            <Input id="imageUrl" placeholder="https://…/bild.jpg" {...register('imageUrl')} />
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Vorschau"
                className="mt-2 max-h-32 rounded border"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="isActive"
              type="checkbox"
              {...register('isActive')}
              defaultChecked={defaultValues?.isActive ?? true}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Aktiv (im Angebot / Rechnung verfügbar)
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
