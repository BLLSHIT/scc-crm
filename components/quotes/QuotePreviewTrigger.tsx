'use client'
import { useState } from 'react'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuotePreviewDrawer } from '@/components/quotes/QuotePreviewDrawer'

interface Props {
  quoteId: string
  quoteNumber: string
  variant?: 'primary' | 'outline'
}

export function QuotePreviewTrigger({ quoteId, quoteNumber, variant = 'outline' }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={variant === 'primary' ? 'default' : 'outline'}
        onClick={() => setOpen(true)}
      >
        <Eye className="w-4 h-4 mr-2" />
        Vorschau
      </Button>
      <QuotePreviewDrawer
        open={open}
        onClose={() => setOpen(false)}
        quoteId={quoteId}
        quoteNumber={quoteNumber}
      />
    </>
  )
}
