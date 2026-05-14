'use client'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PrintButton() {
  return (
    <Button type="button" size="sm" onClick={() => window.print()}>
      <Printer className="w-4 h-4 mr-2" />
      Drucken / Als PDF speichern
    </Button>
  )
}
