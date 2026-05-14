import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { buttonVariants } from '@/components/ui/button'
import type { Profile } from '@/types/app.types'

export default async function NewQuotePlaceholderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Neues Angebot" profile={(profile as Profile) ?? null} />
      <main className="p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 max-w-2xl space-y-3">
          <p className="text-amber-900 font-medium">
            Angebots-Editor wird gerade gebaut (Schritt C).
          </p>
          <p className="text-sm text-amber-800">
            Inhalte: Empfänger-Auswahl, Line-Items-Editor mit Produkt-Picker,
            Live-Berechnung von Netto/MwSt/Brutto, Textbausteine, optionale Positionen.
          </p>
          <Link
            href="/quotes"
            className={buttonVariants({ size: 'sm', variant: 'outline' })}
          >
            Zurück zur Liste
          </Link>
        </div>
      </main>
    </div>
  )
}
