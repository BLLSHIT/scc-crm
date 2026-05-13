import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import type { Profile } from '@/types/app.types'

export default async function InvoicesPlaceholderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Rechnungen" profile={(profile as Profile) ?? null} />
      <main className="p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 max-w-2xl">
          <p className="text-amber-900 font-medium">Rechnungen — kommt in Runde 2.3</p>
          <p className="text-sm text-amber-800 mt-2">
            Konvertierung „Angebot → Rechnung" mit einem Klick, automatische
            Nummerierung (RE-2026-0001), Zahlungseingänge, Status (offen / bezahlt / überfällig).
          </p>
        </div>
      </main>
    </div>
  )
}
