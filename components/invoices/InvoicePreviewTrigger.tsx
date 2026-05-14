'use client'
import { useState } from 'react'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvoicePreviewDrawer } from '@/components/invoices/InvoicePreviewDrawer'

interface Props {
  invoiceId: string
  invoiceNumber: string
}

export function InvoicePreviewTrigger({ invoiceId, invoiceNumber }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Eye className="w-4 h-4 mr-2" />
        Vorschau
      </Button>
      <InvoicePreviewDrawer
        open={open}
        onClose={() => setOpen(false)}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
      />
    </>
  )
}
