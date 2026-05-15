/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TrendingUp,
  Target,
  Trophy,
  Clock,
  CheckSquare,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Lock,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  Paperclip,
  MessageSquare,
  Activity,
} from 'lucide-react'
import { formatCurrency, formatDate, formatRelative } from '@/lib/utils/format'
import { getRecentActivity, type FeedItem } from '@/lib/db/activity-logs'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: 'vertrieb' | 'management' }>
}) {
  const sp = await searchParams
  // view wird nach Auth/Rolle-Check nochmal geprüft (s.u.)
  const requestedView = sp.view === 'management' ? 'management' : 'vertrieb'

  let profile: Profile | null = null
  let openDealsTotal = 0
  let weightedForecast = 0
  let wonCount = 0
  let lostCount = 0
  let avgCycleDays = 0
  let tasksDueTodayCount = 0
  let tasksOpenTotalCount = 0
  let stageBreakdown: { id: string; name: string; color: string; total: number; count: number }[] = []
  let todaysTasks: any[] = []
  let topDeals: any[] = []
  let inactiveDeals: any[] = []
  let expiringQuotes: any[] = []
  // GF-only
  let isAdmin = false
  let marginDeals: { id: string; title: string; company: string; umsatz: number; marginPercent: number }[] = []
  let avgMarginPercent: number | null = null
  let recentFeed: FeedItem[] = []

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')

    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null

    // Stages laden — werden für mehrere Berechnungen genutzt
    const { data: allStages } = await supabase
      .from('pipeline_stages')
      .select('id, name, color, isWon, isLost, "order"')
      .order('order', { ascending: true })
    const stages = allStages ?? []
    const openStageIds = stages.filter((s) => !s.isWon && !s.isLost).map((s) => s.id)
    const wonStageIds = stages.filter((s) => s.isWon).map((s) => s.id)
    const lostStageIds = stages.filter((s) => s.isLost).map((s) => s.id)

    // Alle offenen Deals (value, probability, stageId) – Basis für Pipeline + Forecast
    const { data: openDeals } = openStageIds.length > 0
      ? await supabase
          .from('deals')
          .select('id, value, probability, stageId')
          .in('stageId', openStageIds)
      : { data: [] as any[] }
    const od = openDeals ?? []
    openDealsTotal = od.reduce((s: number, d: any) => s + Number(d.value ?? 0), 0)
    weightedForecast = od.reduce(
      (s: number, d: any) => s + Number(d.value ?? 0) * (Number(d.probability ?? 0) / 100),
      0
    )

    // Won / Lost / Cycle
    if (wonStageIds.length > 0) {
      const { data: wonDeals } = await supabase
        .from('deals')
        .select('id, createdAt, updatedAt')
        .in('stageId', wonStageIds)
      wonCount = (wonDeals ?? []).length
      if (wonCount > 0) {
        const totalDays = (wonDeals ?? []).reduce((sum: number, d: any) => {
          const start = new Date(d.createdAt).getTime()
          const end = new Date(d.updatedAt ?? d.createdAt).getTime()
          return sum + Math.max(0, (end - start) / 86_400_000)
        }, 0)
        avgCycleDays = Math.round(totalDays / wonCount)
      }
    }
    if (lostStageIds.length > 0) {
      const { count } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .in('stageId', lostStageIds)
      lostCount = count ?? 0
    }

    // Pipeline by stage
    const stageMap = new Map<string, { id: string; name: string; color: string; total: number; count: number }>()
    for (const s of stages.filter((x) => !x.isWon && !x.isLost)) {
      stageMap.set(s.id, { id: s.id, name: s.name, color: s.color, total: 0, count: 0 })
    }
    for (const d of od) {
      const entry = stageMap.get(d.stageId)
      if (entry) {
        entry.total += Number(d.value ?? 0)
        entry.count += 1
      }
    }
    stageBreakdown = Array.from(stageMap.values())

    // Tasks heute
    const todayStart = new Date(new Date().toDateString()).toISOString()
    const todayEnd = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    const [tasksTodayRes, tasksOpenRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, priority, dueDate, dealId, contactId, companyId')
        .neq('status', 'done')
        .gte('dueDate', todayStart.slice(0, 10))
        .lt('dueDate', todayEnd)
        .order('priority', { ascending: false })
        .limit(8),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'done'),
    ])
    todaysTasks = tasksTodayRes.data ?? []
    tasksDueTodayCount = todaysTasks.length
    tasksOpenTotalCount = tasksOpenRes.count ?? 0

    // Top 10 offene Deals
    if (openStageIds.length > 0) {
      const { data: top } = await supabase
        .from('deals')
        .select(
          `id, title, value, currency, probability,
           stage:pipeline_stages(name, color),
           company:companies(id, name)`
        )
        .in('stageId', openStageIds)
        .order('value', { ascending: false })
        .limit(10)
      topDeals = top ?? []
    }

    // Inactive Deals (offen, updatedAt > 14 Tage alt)
    if (openStageIds.length > 0) {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000).toISOString()
      const { data: inactive } = await supabase
        .from('deals')
        .select('id, title, value, currency, updatedAt, company:companies(name)')
        .in('stageId', openStageIds)
        .lt('updatedAt', fourteenDaysAgo)
        .order('updatedAt', { ascending: true })
        .limit(5)
      inactiveDeals = inactive ?? []
    }

    // Quotes laufen bald ab
    const todayIso = new Date().toISOString().slice(0, 10)
    const in14DaysIso = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)
    const { data: expiring } = await supabase
      .from('quotes')
      .select('id, quoteNumber, title, validUntil, totalGross, company:companies(name)')
      .in('status', ['draft', 'sent'])
      .gte('validUntil', todayIso)
      .lte('validUntil', in14DaysIso)
      .order('validUntil', { ascending: true })
      .limit(5)
    expiringQuotes = expiring ?? []

    // ── Geschäftsführung: Margen-Analyse (nur Admin) ──────────────────────
    isAdmin = profile?.role === 'admin'
    if (isAdmin && requestedView === 'management') {
      const { data: acceptedQuotes } = await supabase
        .from('quotes')
        .select(
          `id, totalGross, dealId,
           deal:deals(id, title, company:companies(name)),
           quote_line_items(quantity, product:products(purchasePriceNet))`
        )
        .eq('status', 'accepted')
        .not('dealId', 'is', null)
        .order('totalGross', { ascending: false })
        .limit(50)

      const rawMargins: { id: string; title: string; company: string; umsatz: number; marginPercent: number }[] = []
      let totalWeightedMargin = 0
      let totalUmsatz = 0

      for (const q of (acceptedQuotes ?? [])) {
        const gross = Number(q.totalGross ?? 0)
        if (gross <= 0) continue
        let totalEk = 0
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const li of ((q.quote_line_items as any[]) ?? [])) {
          totalEk += Number(li.product?.purchasePriceNet ?? 0) * Number(li.quantity ?? 1)
        }
        const margin = Math.round(((gross - totalEk) / gross) * 100)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const deal = q.deal as any
        rawMargins.push({
          id: deal?.id ?? q.id,
          title: deal?.title ?? '—',
          company: deal?.company?.name ?? '—',
          umsatz: gross,
          marginPercent: margin,
        })
        totalWeightedMargin += margin * gross
        totalUmsatz += gross
      }

      marginDeals = rawMargins.sort((a, b) => b.umsatz - a.umsatz).slice(0, 15)
      avgMarginPercent = totalUmsatz > 0 ? Math.round(totalWeightedMargin / totalUmsatz) : null
    }
    recentFeed = await getRecentActivity(20)
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Dashboard" err={err} />
  }

  // Nicht-Admins landen immer in der Vertrieb-Ansicht
  const view = isAdmin ? requestedView : 'vertrieb'

  const winRate =
    wonCount + lostCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0
  const maxStageTotal = Math.max(1, ...stageBreakdown.map((s) => s.total))

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Übersicht" profile={profile} />
      <main className="p-6 space-y-6">
        {/* Titel + Toggle */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Übersicht</h2>
            <p className="text-sm text-slate-500">Ihre Vertriebskennzahlen auf einen Blick.</p>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            <Link
              href="/?view=vertrieb"
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                view === 'vertrieb'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Vertrieb
            </Link>
            {isAdmin ? (
              <Link
                href="/?view=management"
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                  view === 'management'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Geschäftsführung
              </Link>
            ) : (
              <span className="px-4 py-1.5 text-sm rounded-md text-slate-300 flex items-center gap-1.5 cursor-not-allowed">
                <Lock className="w-3 h-3" />
                Geschäftsführung
              </span>
            )}
          </div>
        </div>

        {/* 5 KPI-Kacheln */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            icon={TrendingUp}
            label="Pipeline-Wert"
            value={formatCurrency(openDealsTotal, 'EUR')}
            sub={`${openDealsTotalCountLabel(stageBreakdown)} offene Verkaufschancen`}
            color="text-slate-900"
            iconColor="text-blue-600"
          />
          <KpiCard
            icon={Target}
            label="Gewichteter Forecast"
            value={formatCurrency(weightedForecast, 'EUR')}
            sub="Σ Wert × Wahrscheinlichkeit"
            color="text-slate-900"
            iconColor="text-violet-600"
          />
          <KpiCard
            icon={Trophy}
            label="Win-Rate"
            value={`${winRate.toFixed(0)} %`}
            sub={`${wonCount} gewonnen / ${lostCount} verloren`}
            color="text-emerald-600"
            iconColor="text-emerald-600"
          />
          <KpiCard
            icon={Clock}
            label="Ø Verkaufszyklus"
            value={`${avgCycleDays} ${avgCycleDays === 1 ? 'Tag' : 'Tage'}`}
            sub="Durchschnitt gewonnener Deals"
            color="text-slate-900"
            iconColor="text-amber-600"
          />
          <KpiCard
            icon={CheckSquare}
            label="Aufgaben heute fällig"
            value={String(tasksDueTodayCount)}
            sub={`${tasksOpenTotalCount} offen gesamt`}
            color={tasksDueTodayCount > 0 ? 'text-amber-600' : 'text-emerald-600'}
            iconColor="text-amber-600"
          />
        </div>

        {/* Pipeline-Chart + Heute fällig */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Pipeline-Überblick nach Stage</CardTitle>
            </CardHeader>
            <CardContent>
              {stageBreakdown.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">
                  Keine offenen Stages.
                </p>
              ) : (
                <div className="space-y-3">
                  {stageBreakdown.map((s) => {
                    const widthPct = (s.total / maxStageTotal) * 100
                    return (
                      <div key={s.id}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: s.color }}
                            />
                            <span className="font-medium text-slate-700">{s.name}</span>
                            <span className="text-xs text-slate-400">({s.count})</span>
                          </div>
                          <span className="font-medium text-slate-700 tabular-nums">
                            {formatCurrency(s.total, 'EUR')}
                          </span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.max(2, widthPct)}%`,
                              backgroundColor: s.color,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Heute fällig</CardTitle>
              <Link href="/tasks" className="text-xs text-blue-600 hover:underline">
                Alle anzeigen
              </Link>
            </CardHeader>
            <CardContent>
              {todaysTasks.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-sm text-slate-500">Keine Aufgaben heute fällig</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {todaysTasks.map((t: any) => (
                    <li key={t.id}>
                      <Link
                        href={`/tasks/${t.id}/edit`}
                        className="block p-2 -mx-2 rounded-md hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <PriorityDot priority={t.priority} />
                          <span className="text-sm font-medium text-slate-900 truncate">
                            {t.title}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Geschäftsführungs-Ansicht: Margen-Analyse ── */}
        {view === 'management' && isAdmin && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">Margen-Analyse (akzeptierte Angebote)</h3>
              {avgMarginPercent !== null && (
                <span className={`ml-auto px-3 py-1 text-sm font-bold rounded-full ${
                  avgMarginPercent >= 30 ? 'bg-emerald-100 text-emerald-700' :
                  avgMarginPercent >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>
                  Ø Marge: {avgMarginPercent}%
                </span>
              )}
            </div>
            <Card>
              <CardContent className="p-0">
                {marginDeals.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Keine akzeptierten Angebote mit Produktdaten gefunden.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-slate-600">Deal</th>
                        <th className="text-left px-4 py-2.5 font-medium text-slate-600">Firma</th>
                        <th className="text-right px-4 py-2.5 font-medium text-slate-600">Umsatz (Brutto)</th>
                        <th className="text-right px-4 py-2.5 font-medium text-slate-600">Soll-Marge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {marginDeals.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            <Link href={`/deals/${m.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                              {m.title}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">{m.company}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-sm">
                            {formatCurrency(m.umsatz, 'EUR')}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`font-bold ${
                              m.marginPercent >= 30 ? 'text-emerald-600' :
                              m.marginPercent >= 10 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {m.marginPercent}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
            <p className="text-xs text-slate-400">
              Soll-Marge = (Brutto-Umsatz − Σ EK-Netto) / Brutto-Umsatz. Nur Deals mit akzeptiertem Angebot werden angezeigt.
            </p>
          </div>
        )}

        {/* Top 10 + Inaktive Deals + Quotes laufen ab */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Top 10 Verkaufschancen</CardTitle>
              <Link href="/deals" className="text-xs text-blue-600 hover:underline">
                Zur Pipeline
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {topDeals.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  Keine offenen Verkaufschancen vorhanden
                </p>
              ) : (
                <ul className="divide-y">
                  {topDeals.map((d: any, idx: number) => (
                    <li key={d.id}>
                      <Link
                        href={`/deals/${d.id}`}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xs text-slate-400 w-5 text-right tabular-nums">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {d.title}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {d.company?.name ?? '—'}
                          </p>
                        </div>
                        {d.stage && (
                          <span
                            className="px-2 py-0.5 text-xs rounded"
                            style={{
                              backgroundColor: (d.stage.color ?? '#6366f1') + '20',
                              color: d.stage.color ?? '#6366f1',
                            }}
                          >
                            {d.stage.name}
                          </span>
                        )}
                        <span className="text-sm font-semibold text-slate-700 tabular-nums w-28 text-right">
                          {formatCurrency(Number(d.value ?? 0), d.currency ?? 'EUR')}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Inaktive Deals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Keine Aktivität seit &gt;14 Tagen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inactiveDeals.length === 0 ? (
                  <p className="text-sm text-slate-500">Alle Deals sind aktuell betreut.</p>
                ) : (
                  <ul className="space-y-2">
                    {inactiveDeals.map((d: any) => (
                      <li key={d.id}>
                        <Link
                          href={`/deals/${d.id}`}
                          className="block p-2 -mx-2 rounded-md hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-slate-900 truncate">
                              {d.title}
                            </span>
                            <span className="text-xs text-amber-700 whitespace-nowrap">
                              {formatDate(d.updatedAt)}
                            </span>
                          </div>
                          {d.company?.name && (
                            <p className="text-xs text-slate-500 truncate">{d.company.name}</p>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Quotes expiring */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-red-500" />
                  Angebote laufen ab (14 Tage)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expiringQuotes.length === 0 ? (
                  <p className="text-sm text-slate-500">Kein Angebot läuft in den nächsten 14 Tagen ab.</p>
                ) : (
                  <ul className="space-y-2">
                    {expiringQuotes.map((q: any) => (
                      <li key={q.id}>
                        <Link
                          href={`/quotes/${q.id}`}
                          className="block p-2 -mx-2 rounded-md hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-blue-600">
                              {q.quoteNumber}
                            </span>
                            <span className="text-xs text-red-700 whitespace-nowrap">
                              {formatDate(q.validUntil)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-900 truncate">{q.title}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Globaler Aktivitäts-Feed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Letzte Aktivitäten</CardTitle>
            <a href="/deals" className="text-xs text-blue-600 hover:underline">Alle →</a>
          </CardHeader>
          <CardContent>
            {recentFeed.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Noch keine Aktivitäten vorhanden.</p>
            ) : (
              <ul className="space-y-3">
                {recentFeed.slice(0, 15).map((item) => (
                  <FeedItemRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

// ───────────────────────────────────────────────
// Helper-Komponenten
// ───────────────────────────────────────────────

const FEED_ICON: Record<string, any> = {
  created:        Plus,
  updated:        Pencil,
  deleted:        Trash2,
  status_changed: ArrowRight,
  file_uploaded:  Paperclip,
  file_deleted:   Trash2,
  note_added:     MessageSquare,
}
const FEED_COLOR: Record<string, string> = {
  created:        'text-blue-600 bg-blue-50',
  updated:        'text-slate-600 bg-slate-100',
  deleted:        'text-red-600 bg-red-50',
  status_changed: 'text-violet-600 bg-violet-50',
  file_uploaded:  'text-slate-600 bg-slate-100',
  file_deleted:   'text-red-600 bg-red-50',
  note_added:     'text-amber-600 bg-amber-50',
}

const ENTITY_ROUTE: Record<string, string> = {
  deal: 'deals',
  contact: 'contacts',
  company: 'companies',
  project: 'projects',
  quote: 'quotes',
  task: 'tasks',
}

function FeedItemRow({ item }: { item: FeedItem }) {
  const Icon = FEED_ICON[item.action] ?? Activity
  const color = FEED_COLOR[item.action] ?? 'text-slate-500 bg-slate-100'
  const entityPath = `/${ENTITY_ROUTE[item.entityType] ?? `${item.entityType}s`}/${item.entityId}`
  const summary = item.summary
    ? item.summary.length > 80 ? item.summary.slice(0, 80) + '…' : item.summary
    : null

  return (
    <li className="flex gap-3 text-sm">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            href={entityPath}
            className="font-medium text-blue-600 hover:underline truncate max-w-[140px]"
          >
            {item.entityLabel ?? item.entityType}
          </Link>
          {summary && (
            <span className="text-slate-700 truncate">{summary}</span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {item.userName ? `${item.userName} · ` : ''}{formatRelative(item.createdAt)}
        </p>
      </div>
    </li>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  iconColor,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any
  label: string
  value: string
  sub: string
  color: string
  iconColor: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-500">
            {label}
          </span>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-slate-500 mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}

function PriorityDot({ priority }: { priority: 'low' | 'medium' | 'high' }) {
  const color =
    priority === 'high' ? 'bg-red-500' : priority === 'medium' ? 'bg-amber-500' : 'bg-slate-300'
  return <span className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
}

function openDealsTotalCountLabel(
  stages: { count: number }[]
): string {
  const count = stages.reduce((s, x) => s + x.count, 0)
  return String(count)
}
