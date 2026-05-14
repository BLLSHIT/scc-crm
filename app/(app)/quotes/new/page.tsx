/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { QuoteForm } from '@/components/quotes/QuoteForm'
import { createQuote } from '@/lib/actions/quotes.actions'
import { getSettings } from '@/lib/db/settings'
import { getAllCompanyOptions } from '@/lib/db/companies'
import { getAllContactOptions } from '@/lib/db/contacts'
import { getActiveTeamMemberOptions } from '@/lib/db/team-members'
import { getActiveProductOptions } from '@/lib/db/products'
import { getTextModules } from '@/lib/db/text-modules'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ dealId?: string }>
}) {
  const sp = await searchParams
  let profile: Profile | null = null
  let companies: any[] = []
  let contacts: any[] = []
  let teamMembers: any[] = []
  let products: any[] = []
  let textModules: any[] = []
  let validUntilDefault = ''
  let prefillFromDeal: { companyId?: string; teamMemberId?: string } = {}

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null

    const [settings, c, p, tm, prod, tmod] = await Promise.all([
      getSettings(),
      getAllCompanyOptions(),
      getAllContactOptions(),
      getActiveTeamMemberOptions(),
      getActiveProductOptions(),
      getTextModules(),
    ])
    companies = c
    contacts = p
    teamMembers = tm
    products = prod
    textModules = tmod

    const days = settings?.defaultQuoteValidity ?? 30
    const d = new Date()
    d.setDate(d.getDate() + days)
    validUntilDefault = d.toISOString().slice(0, 10)

    if (sp.dealId) {
      const { data: deal } = await supabase
        .from('deals')
        .select('id, title, companyId, teamMemberId')
        .eq('id', sp.dealId)
        .single()
      if (deal) {
        prefillFromDeal = {
          companyId: deal.companyId ?? '',
          teamMemberId: deal.teamMemberId ?? '',
        }
      }
    }
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Angebot vorbereiten" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Neues Angebot" profile={profile} />
      <main className="p-6">
        <QuoteForm
          title="Angebot erstellen"
          onSubmit={createQuote}
          companies={companies}
          contacts={contacts}
          teamMembers={teamMembers}
          products={products}
          textModules={textModules}
          defaultValues={{
            validUntil: validUntilDefault,
            dealId: sp.dealId ?? '',
            ...prefillFromDeal,
          }}
        />
      </main>
    </div>
  )
}
