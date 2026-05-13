/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, TrendingUp, CheckSquare, Calendar, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function DashboardPage() {
  let profile: Profile | null = null
  let kpiData = { contactCount: 0, companyCount: 0, dealCount: 0, openTaskCount: 0 }
  let pipelineValue = 0
  let recentDeals: any[] = []
  let upcomingTasks: any[] = []
  let overdueTasks: any[] = []

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')

    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null

    // Counts in parallel
    const [contactRes, companyRes, dealRes, taskRes] = await Promise.all([
      supabase.from('contacts').select('*', { count: 'exact', head: true }),
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('deals').select('*', { count: 'exact', head: true }),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'done'),
    ])
    kpiData = {
      contactCount: contactRes.count ?? 0,
      companyCount: companyRes.count ?? 0,
      dealCount: dealRes.count ?? 0,
      openTaskCount: taskRes.count ?? 0,
    }

    // Pipeline value: sum of open (not Won/Lost) deals
    const { data: openStages } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('isWon', false)
      .eq('isLost', false)
    const openStageIds = (openStages ?? []).map((s) => s.id)
    if (openStageIds.length > 0) {
      const { data: openDeals } = await supabase
        .from('deals')
        .select('value')
        .in('stageId', openStageIds)
      pipelineValue = (openDeals ?? []).reduce(
        (sum, d: any) => sum + Number(d.value ?? 0),
        0
      )
    }

    // Recent deals (last 5)
    const { data: rd } = await supabase
      .from('deals')
      .select('id, title, value, currency, createdAt, stage:pipeline_stages(name, color)')
      .order('createdAt', { ascending: false })
      .limit(5)
    recentDeals = rd ?? []

    // Tasks: upcoming (next 7 days, not done) + overdue
    const todayISO = new Date().toISOString().slice(0, 10)
    const in7DaysISO = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const [upcomingRes, overdueRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, dueDate, priority')
        .neq('status', 'done')
        .gte('dueDate', todayISO)
        .lte('dueDate', in7DaysISO)
        .order('dueDate', { ascending: true })
        .limit(5),
      supabase
        .from('tasks')
        .select('id, title, dueDate, priority')
        .neq('status', 'done')
        .lt('dueDate', todayISO)
        .order('dueDate', { ascending: true })
        .limit(5),
    ])
    upcomingTasks = upcomingRes.data ?? []
    overdueTasks = overdueRes.data ?? []
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Dashboard" err={err} />
  }

  const kpis = [
    {
      label: 'Kontakte',
      value: kpiData.contactCount,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      href: '/contacts',
    },
    {
      label: 'Firmen',
      value: kpiData.companyCount,
      icon: Building2,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      href: '/companies',
    },
    {
      label: 'Deals',
      value: kpiData.dealCount,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      href: '/deals',
    },
    {
      label: 'Offene Aufgaben',
      value: kpiData.openTaskCount,
      icon: CheckSquare,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      href: '/tasks',
    },
  ]

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Dashboard" profile={profile} />
      <main className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Link key={kpi.label} href={kpi.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">{kpi.label}</p>
                      <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
                    </div>
                    <div className={`${kpi.bg} rounded-lg p-2`}>
                      <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Pipeline Value */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pipeline-Wert (offene Deals)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-700">
              {formatCurrency(pipelineValue, 'EUR')}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Summe aller Deals außer „Gewonnen" und „Verloren"
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Deals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Letzte Deals</CardTitle>
            </CardHeader>
            <CardContent>
              {recentDeals.length === 0 ? (
                <p className="text-sm text-slate-400">Noch keine Deals.</p>
              ) : (
                <ul className="space-y-2">
                  {recentDeals.map((d: any) => (
                    <li key={d.id}>
                      <Link
                        href={`/deals/${d.id}`}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 transition-colors text-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{d.title}</p>
                          {d.stage && (
                            <span
                              className="inline-block mt-1 px-2 py-0.5 text-xs rounded"
                              style={{
                                backgroundColor: (d.stage.color ?? '#6366f1') + '20',
                                color: d.stage.color ?? '#6366f1',
                              }}
                            >
                              {d.stage.name}
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-slate-700">
                          {formatCurrency(d.value ?? 0, d.currency ?? 'EUR')}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aufgaben</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {overdueTasks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Überfällig ({overdueTasks.length})
                  </p>
                  <ul className="space-y-1">
                    {overdueTasks.map((t: any) => (
                      <li key={t.id}>
                        <Link
                          href={`/tasks/${t.id}/edit`}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-red-50 transition-colors text-sm"
                        >
                          <span className="text-slate-900">{t.title}</span>
                          <span className="text-xs text-red-600">{formatDate(t.dueDate)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Diese Woche
                </p>
                {upcomingTasks.length === 0 ? (
                  <p className="text-sm text-slate-400">Nichts fällig diese Woche.</p>
                ) : (
                  <ul className="space-y-1">
                    {upcomingTasks.map((t: any) => (
                      <li key={t.id}>
                        <Link
                          href={`/tasks/${t.id}/edit`}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 transition-colors text-sm"
                        >
                          <span className="text-slate-900">{t.title}</span>
                          <span className="text-xs text-slate-500">{formatDate(t.dueDate)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Link href="/tasks" className="block text-xs text-blue-600 hover:underline pt-2 border-t">
                Alle Aufgaben anzeigen →
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
