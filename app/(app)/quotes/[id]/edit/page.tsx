/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { QuoteForm } from '@/components/quotes/QuoteForm'
import { getQuoteById } from '@/lib/db/quotes'
import { updateQuote } from '@/lib/actions/quotes.actions'
import { getAllCompanyOptions } from '@/lib/db/companies'
import { getAllContactOptions } from '@/lib/db/contacts'
import { getActiveTeamMemberOptions } from '@/lib/db/team-members'
import { getActiveProductOptions } from '@/lib/db/products'
import { getTextModules } from '@/lib/db/text-modules'
import { getActiveDealOptions } from '@/lib/db/deals'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let profile: Profile | null = null
  let quote: any
  let companies: any[] = []
  let contacts: any[] = []
  let teamMembers: any[] = []
  let products: any[] = []
  let textModules: any[] = []
  let deals: any[] = []

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null

    const [q, c, ct, tm, prod, tmod, dls] = await Promise.all([
      getQuoteById(id),
      getAllCompanyOptions(),
      getAllContactOptions(),
      getActiveTeamMemberOptions(),
      getActiveProductOptions(),
      getTextModules(),
      getActiveDealOptions(),
    ])
    quote = q
    companies = c
    contacts = ct
    teamMembers = tm
    products = prod
    textModules = tmod
    deals = dls
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Angebot laden" err={err} />
  }

  if (!quote) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          Angebot nicht gefunden.
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title={`Angebot ${quote.quoteNumber} bearbeiten`} profile={profile} />
      <main className="p-6">
        <QuoteForm
          title="Angebot bearbeiten"
          onSubmit={updateQuote.bind(null, id)}
          companies={companies}
          contacts={contacts}
          teamMembers={teamMembers}
          products={products}
          textModules={textModules}
          deals={deals}
          defaultValues={{
            title: quote.title ?? '',
            validUntil: quote.validUntil ? String(quote.validUntil).slice(0, 10) : '',
            companyId: quote.companyId ?? '',
            contactId: quote.contactId ?? '',
            teamMemberId: quote.teamMemberId ?? '',
            dealId: quote.dealId ?? '',
            greeting: quote.greeting ?? '',
            intro: quote.intro ?? '',
            footer: quote.footer ?? '',
            paymentTerms: quote.paymentTerms ?? '',
            globalDiscountPercent: Number(quote.globalDiscountPercent ?? 0),
            lineItems: (quote.lineItems ?? []).map((it: any) => ({
              itemType: (it.itemType ?? 'product') as 'product' | 'text',
              productId: it.productId ?? '',
              name: it.name ?? '',
              description: it.description ?? '',
              imageUrl: it.imageUrl ?? '',
              unit: it.unit ?? 'Stück',
              quantity: Number(it.quantity ?? 1),
              unitPriceNet: Number(it.unitPriceNet ?? 0),
              discountPercent: Number(it.discountPercent ?? 0),
              vatRate: Number(it.vatRate ?? 19),
              isOptional: Boolean(it.isOptional),
              sortOrder: Number(it.sortOrder ?? 0),
            })),
          }}
        />
      </main>
    </div>
  )
}
