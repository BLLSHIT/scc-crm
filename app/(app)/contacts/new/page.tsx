import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ContactForm } from '@/components/contacts/ContactForm'
import { createContact } from '@/lib/actions/contacts.actions'
import type { Profile } from '@/types/app.types'

export default async function NewContactPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Neuer Kontakt" profile={(profile as Profile) ?? null} />
      <main className="p-6">
        <ContactForm title="Kontakt erstellen" onSubmit={createContact} />
      </main>
    </div>
  )
}
