import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDefaultPipeline, getDealsForPipeline } from '@/lib/db/deals'
import { Header } from '@/components/layout/Header'
import { PipelineBoard } from '@/components/deals/PipelineBoard'
import { Plus } from 'lucide-react'
import type { Profile } from '@/types/app.types'

export default async function DealsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const pipeline = await getDefaultPipeline().catch(() => null)
  const { stages, deals } = pipeline
    ? await getDealsForPipeline(pipeline.id)
    : { stages: [], deals: [] }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Deals"
        profile={(profile as Profile) ?? null}
        actions={
          <Link
            href="/deals/new"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Deal
          </Link>
        }
      />
      <main className="flex-1 overflow-hidden p-6">
        <PipelineBoard stages={stages} initialDeals={deals as any} />
      </main>
    </div>
  )
}
