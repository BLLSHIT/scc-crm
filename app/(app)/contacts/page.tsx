import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getContacts } from '@/lib/db/contacts'
import { Header } from '@/components/layout/Header'
import { SearchBar } from '@/components/layout/SearchBar'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ContactsTable } from '@/components/contacts/ContactsTable'
import type { Profile } from '@/types/app.types'

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const { contacts, total } = await getContacts({
    q: params.q,
    page: params.page ? Number(params.page) : 1,
  })

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`Kontakte (${total})`}
        profile={(profile as Profile) ?? null}
        actions={
          <Link href="/contacts/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="w-4 h-4 mr-2" />
            Kontakt
          </Link>
        }
      />
      <main className="p-6 space-y-4">
        <SearchBar placeholder="Kontakte durchsuchen…" />
        <ContactsTable contacts={contacts} />
      </main>
    </div>
  )
}
