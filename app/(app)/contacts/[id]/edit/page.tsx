import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getContactById } from '@/lib/db/contacts'
import { updateContact } from '@/lib/actions/contacts.actions'
import { Header } from '@/components/layout/Header'
import { ContactForm } from '@/components/contacts/ContactForm'
import type { Profile } from '@/types/app.types'

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user!.id).single()

  let contact: any
  try {
    contact = await getContactById(id)
  } catch {
    notFound()
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Kontakt bearbeiten" profile={profile as Profile} />
      <main className="p-6">
        <ContactForm
          title="Kontakt bearbeiten"
          defaultValues={{
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email ?? '',
            phone: contact.phone ?? '',
            position: contact.position ?? '',
            source: contact.source ?? '',
            notes: contact.notes ?? '',
            companyId: contact.companyId ?? '',
            ownerId: contact.ownerId ?? '',
            tags: contact.tags ?? [],
          }}
          onSubmit={(data) => updateContact(id, data)}
        />
      </main>
    </div>
  )
}
