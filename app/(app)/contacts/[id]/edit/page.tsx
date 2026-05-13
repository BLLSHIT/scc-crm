/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getContactById } from '@/lib/db/contacts'
import { getAllCompanyOptions } from '@/lib/db/companies'
import { updateContact } from '@/lib/actions/contacts.actions'
import { Header } from '@/components/layout/Header'
import { ContactForm } from '@/components/contacts/ContactForm'
import type { Profile } from '@/types/app.types'

function isFrameworkError(err: any): boolean {
  const d = err?.digest
  if (typeof d === 'string') {
    return d.startsWith('NEXT_REDIRECT') || d === 'NEXT_NOT_FOUND'
  }
  return false
}

function ErrorView({ where, err }: { where: string; err: any }) {
  return (
    <div className="flex-1 p-6">
      <div className="max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 space-y-3">
        <h2 className="font-semibold text-red-800">Fehler in {where}</h2>
        <pre className="text-xs text-red-700 whitespace-pre-wrap break-all bg-white border border-red-100 rounded p-3">
{`name:    ${err?.name ?? '(none)'}
message: ${err?.message ?? String(err)}
code:    ${err?.code ?? '(none)'}
hint:    ${err?.hint ?? '(none)'}
details: ${err?.details ?? '(none)'}
digest:  ${err?.digest ?? '(none)'}

stack:
${err?.stack ?? '(none)'}`}
        </pre>
      </div>
    </div>
  )
}

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let profile: Profile | null = null
  try {
    const supabase = await createClient()
    const { data: userData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!userData.user) redirect('/login')
    const profileResult = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single()
    profile = (profileResult.data as Profile) ?? null
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Auth/Profile" err={err} />
  }

  let contact: any
  try {
    contact = await getContactById(id)
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="getContactById" err={err} />
  }
  if (!contact) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          Kontakt nicht gefunden.
        </div>
      </div>
    )
  }

  const companies = await getAllCompanyOptions()

  try {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Kontakt bearbeiten" profile={profile} />
        <main className="p-6">
          <ContactForm
            title="Kontakt bearbeiten"
            companies={companies}
            defaultValues={{
              firstName: contact.firstName ?? '',
              lastName: contact.lastName ?? '',
              email: contact.email ?? '',
              phone: contact.phone ?? '',
              mobile: contact.mobile ?? '',
              linkedin: contact.linkedin ?? '',
              instagram: contact.instagram ?? '',
              position: contact.position ?? '',
              source: contact.source ?? '',
              notes: contact.notes ?? '',
              companyId: contact.companyId ?? '',
              ownerId: contact.ownerId ?? '',
              tags: contact.tags ?? [],
            }}
            onSubmit={updateContact.bind(null, id)}
          />
        </main>
      </div>
    )
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Render" err={err} />
  }
}
