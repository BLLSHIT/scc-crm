import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getContacts } from '@/lib/db/contacts'
import { Header } from '@/components/layout/Header'
import { buttonVariants } from '@/components/ui/button'
import { Plus, Mail, Phone } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import type { Profile } from '@/types/app.types'

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user!.id).single()

  const { contacts, total } = await getContacts({
    q: params.q,
    page: params.page ? Number(params.page) : 1,
  })

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`Kontakte (${total})`}
        profile={profile as Profile}
        actions={
          <Link href="/contacts/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="w-4 h-4 mr-2" />
            Kontakt
          </Link>
        }
      />
      <main className="p-6">
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Firma</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Position</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Kontakt</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Erstellt</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    Noch keine Kontakte.{' '}
                    <Link href="/contacts/new" className="text-blue-600 hover:underline">
                      Ersten Kontakt anlegen
                    </Link>
                  </td>
                </tr>
              )}
              {contacts.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/contacts/${c.id}`}
                      className="font-medium text-slate-900 hover:text-blue-600"
                    >
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.company?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.position ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className="text-slate-400 hover:text-blue-600"
                          title={c.email}
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                      {c.phone && (
                        <a
                          href={`tel:${c.phone}`}
                          className="text-slate-400 hover:text-slate-700"
                          title={c.phone}
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
