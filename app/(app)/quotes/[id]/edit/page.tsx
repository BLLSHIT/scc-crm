import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { buttonVariants } from '@/components/ui/button'
import type { Profile } from '@/types/app.types'

export default async function EditQuotePlaceholderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Angebot bearbeiten" profile={(profile as Profile) ?? null} />
      <main className="p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 max-w-2xl space-y-3">
          <p className="text-amber-900 font-medium">
            Editor wird in Schritt C gebaut.
          </p>
          <Link
            href={`/quotes/${id}`}
            className={buttonVariants({ size: 'sm', variant: 'outline' })}
          >
            Zurück zum Angebot
          </Link>
        </div>
      </main>
    </div>
  )
}
