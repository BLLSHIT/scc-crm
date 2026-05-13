'use client'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { companySchema, type CompanyInput } from '@/lib/validations/company.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CompanyFormProps {
  defaultValues?: Partial<CompanyInput>
  onSubmit: (data: CompanyInput) => Promise<{ error?: Record<string, string[]> } | void>
  title: string
}

export function CompanyForm({ defaultValues, onSubmit, title }: CompanyFormProps) {
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(companySchema) as any,
    defaultValues: { tags: [], ...defaultValues },
  })

  function submit(data: CompanyInput) {
    // Auto-prepend https:// if the user typed a URL without a protocol
    if (data.website && !/^https?:\/\//i.test(data.website)) {
      data.website = `https://${data.website}`
    }
    startTransition(async () => {
      await onSubmit(data)
    })
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Firmenname *</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="industry">Branche</Label>
              <Input id="industry" {...register('industry')} placeholder="z.B. Sport, Hotellerie" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="size">Größe</Label>
              <Input id="size" {...register('size')} placeholder="z.B. 10-50" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" type="url" {...register('website')} placeholder="https://" />
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
            <Button type="button" variant="outline" onClick={() => history.back()}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
