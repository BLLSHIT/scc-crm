'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

interface Option { id: string; name: string }

interface Props {
  options: Option[]
  /** URL-Param-Name, z.B. "category" */
  paramName?: string
  /** Label für „Alle"-Option */
  allLabel?: string
}

export function CategoryFilter({
  options,
  paramName = 'category',
  allLabel = 'Alle Kategorien',
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get(paramName) ?? ''

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(paramName, value)
    else params.delete(paramName)
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="border border-input bg-background px-3 py-2 text-sm rounded-md min-w-[200px]"
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.id} value={o.name}>{o.name}</option>
      ))}
    </select>
  )
}
