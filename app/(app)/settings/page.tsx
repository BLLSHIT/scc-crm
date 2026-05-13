/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { SettingsForm } from '@/components/settings/SettingsForm'
import { getSettings } from '@/lib/db/settings'
import { updateSettings } from '@/lib/actions/settings.actions'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function SettingsPage() {
  let profile: Profile | null = null
  let settings: any = null

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    settings = await getSettings()
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Einstellungen laden" err={err} />
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Einstellungen" profile={profile} />
      <main className="p-6">
        <SettingsForm
          defaultValues={{
            companyName: settings.companyName ?? '',
            companyAddress: settings.companyAddress ?? '',
            companyZip: settings.companyZip ?? '',
            companyCity: settings.companyCity ?? '',
            companyCountry: settings.companyCountry ?? 'Deutschland',
            companyEmail: settings.companyEmail ?? '',
            companyPhone: settings.companyPhone ?? '',
            companyWebsite: settings.companyWebsite ?? '',
            taxNumber: settings.taxNumber ?? '',
            ustId: settings.ustId ?? '',
            bankName: settings.bankName ?? '',
            bankIban: settings.bankIban ?? '',
            bankBic: settings.bankBic ?? '',
            logoUrl: settings.logoUrl ?? '',
            defaultQuoteValidity: settings.defaultQuoteValidity ?? 30,
            defaultInvoiceDueDays: settings.defaultInvoiceDueDays ?? 14,
            quoteNumberPrefix: settings.quoteNumberPrefix ?? 'AN',
            invoiceNumberPrefix: settings.invoiceNumberPrefix ?? 'RE',
          }}
          onSubmit={updateSettings}
        />
      </main>
    </div>
  )
}
