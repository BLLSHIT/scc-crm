import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import type { Profile } from '@/types/app.types'

export default async function QuotesPlaceholderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Angebote" profile={(profile as Profile) ?? null} />
      <main className="p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 max-w-2xl">
          <p className="text-amber-900 font-medium">Angebote — kommt in Runde 2.2</p>
          <p className="text-sm text-amber-800 mt-2">
            Editor mit Line-Items, Live-Berechnung, Produkt-Picker, optionalen Positionen
            und PDF-Generierung mit deinem Briefkopf + Textbausteinen.
          </p>
          <p className="text-xs text-amber-700 mt-3">
            Voraussetzung: Einstellungen, Produkte und Textbausteine sind angelegt.
          </p>
        </div>
      </main>
    </div>
  )
}
