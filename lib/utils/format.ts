export function formatCurrency(value: number | string, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(Number(value))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('de-DE').format(d)
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const a = firstName?.charAt(0) ?? '?'
  const b = lastName?.charAt(0) ?? ''
  return `${a}${b}`.toUpperCase()
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
