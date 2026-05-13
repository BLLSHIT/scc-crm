/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTextModules } from '@/lib/db/text-modules'
import { Header } from '@/components/layout/Header'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

const TYPE_LABELS: Record<string, string> = {
  greeting: 'Begrüßung',
  intro: 'Einleitung',
  footer: 'Fußzeile',
  payment_terms: 'Zahlungsbedingungen',
  other: 'Sonstiges',
}

const TYPE_COLORS: Record<string, string> = {
  greeting: 'bg-blue-100 text-blue-700',
  intro: 'bg-violet-100 text-violet-700',
  footer: 'bg-slate-100 text-slate-700',
  payment_terms: 'bg-amber-100 text-amber-700',
  other: 'bg-emerald-100 text-emerald-700',
}

export default async function TextModulesPage() {
  let profile: Profile | null = null
  let modules: any[] = []

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    modules = await getTextModules()
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Textbausteine laden" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={`Textbausteine (${modules.length})`}
        profile={profile}
        actions={
          <Link href="/text-modules/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="w-4 h-4 mr-2" />
            Textbaustein
          </Link>
        }
      />
      <main className="p-6">
        <p className="text-sm text-slate-500 mb-4">
          Wiederverwendbare Textblöcke für Angebote und Rechnungen.
          Werden im Editor zum Anklicken angeboten.
        </p>
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Typ</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Vorschau</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Standard</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {modules.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    Noch keine Textbausteine.{' '}
                    <Link href="/text-modules/new" className="text-blue-600 hover:underline">
                      Ersten anlegen
                    </Link>
                  </td>
                </tr>
              )}
              {modules.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/text-modules/${m.id}/edit`}
                      className="font-medium text-slate-900 hover:text-blue-600"
                    >
                      {m.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${TYPE_COLORS[m.type] ?? ''}`}>
                      {TYPE_LABELS[m.type] ?? m.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-md truncate">
                    {m.content.split('\n')[0]}
                  </td>
                  <td className="px-4 py-3">
                    {m.isDefault ? (
                      <span className="text-emerald-600 text-xs font-medium">★ Default</span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
