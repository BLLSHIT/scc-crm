import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Profile } from '@/types/app.types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const [
    { count: contactCount },
    { count: companyCount },
    { count: dealCount },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('deals').select('*', { count: 'exact', head: true }),
  ])

  const kpis = [
    { label: 'Kontakte',  value: contactCount ?? 0, color: 'text-blue-600' },
    { label: 'Firmen',    value: companyCount ?? 0, color: 'text-violet-600' },
    { label: 'Deals',     value: dealCount ?? 0,    color: 'text-emerald-600' },
    { label: 'Projekte',  value: 0,                 color: 'text-orange-600' },
  ]

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Dashboard" profile={profile as Profile} />
      <main className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  {kpi.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center h-48 rounded-xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400 text-sm">
            Weitere Dashboard-Widgets folgen in Phase 4
          </p>
        </div>
      </main>
    </div>
  )
}
