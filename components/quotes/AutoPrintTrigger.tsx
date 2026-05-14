'use client'
import { useEffect } from 'react'

/**
 * Löst den Druckdialog automatisch aus, wenn die Seite mit ?print=1 geladen wird.
 * Wird auf der Vorschau-Seite verwendet, damit der Download-Button direkt
 * den Browser-PDF-Druck öffnet.
 */
export function AutoPrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => {
      window.print()
    }, 600)
    return () => clearTimeout(t)
  }, [])
  return null
}
