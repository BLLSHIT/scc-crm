/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjectById, getProjectAttachments, type ProjectStatus } from '@/lib/db/projects'
import { getActivityLogs } from '@/lib/db/activity-logs'
import { getOrCreateProtocol } from '@/lib/db/acceptance-protocol'
import { getActiveBuildTeamOptions } from '@/lib/db/build-teams'
import { Header } from '@/components/layout/Header'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectStatusActions } from '@/components/projects/ProjectStatusActions'
import { MilestonesCard } from '@/components/projects/MilestonesCard'
import { PunchListCard } from '@/components/projects/PunchListCard'
import { MaterialChecklistCard } from '@/components/projects/MaterialChecklistCard'
import { ProjectPhotoGallery } from '@/components/projects/ProjectPhotoGallery'
import { ProjectAttachmentsCard } from '@/components/projects/ProjectAttachmentsCard'
import { ActivityTimeline } from '@/components/activity/ActivityTimeline'
import { NoteComposer } from '@/components/activity/NoteComposer'
import { ShareLinkPanel } from '@/components/projects/ShareLinkPanel'
import { HandoverProtocolTrigger } from '@/components/projects/HandoverProtocolTrigger'
import { AcceptanceProtocolTrigger } from '@/components/acceptance/AcceptanceProtocolTrigger'
import { Pencil, Building2, User, UserCheck, Mail, Phone, FileText, MapPin, Receipt, HardHat, Send } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

const STATUS_BADGE: Record<ProjectStatus, string> = {
  planning: 'bg-blue-100 text-blue-700 border-blue-200',
  ordered: 'bg-violet-100 text-violet-700 border-violet-200',
  installation: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  on_hold: 'bg-slate-100 text-slate-600 border-slate-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}
const STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: 'Planung', ordered: 'Material bestellt', installation: 'In Installation',
  completed: 'Abgeschlossen', on_hold: 'Pausiert', cancelled: 'Storniert',
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let profile: Profile | null = null
  let currentUserId: string | null = null
  let project: any
  let attachments: any[] = []
  let dealAttachments: any[] = []
  let activities: any[] = []
  let projectTasks: any[] = []
  let projectInvoices: any[] = []
  let protocol: import('@/lib/db/acceptance-protocol').AcceptanceProtocol | null = null
  let tmRes: { data: { id: string; firstName: string; lastName: string }[] | null } = { data: [] }
  let buildTeams: { id: string; name: string }[] = []

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    currentUserId = user?.id ?? null
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    project = await getProjectById(id)
    if (!project) {
      return (
        <div className="flex-1 p-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">Projekt nicht gefunden.</div>
        </div>
      )
    }
    const [protocolData, teamMembersRes, buildTeamsData] = await Promise.all([
      getOrCreateProtocol(id),
      supabase.from('team_members').select('id, firstName, lastName').eq('isActive', true).order('lastName'),
      getActiveBuildTeamOptions(),
    ])
    protocol = protocolData
    tmRes = teamMembersRes
    buildTeams = buildTeamsData
    attachments = await getProjectAttachments(id)
    // Deal-Dateien für gemeinsamen Datei-Pool
    if (project.dealId) {
      const { data: da } = await supabase
        .from('deal_attachments')
        .select('id, filename, storagePath, fileSize, mimeType, category, uploadedByName, createdAt')
        .eq('dealId', project.dealId)
        .order('createdAt', { ascending: false })
      dealAttachments = da ?? []
    }
    // Activity-Logs für dieses Projekt
    activities = await getActivityLogs('project', id, 30)

    // Tasks für dieses Projekt
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, priority, dueDate, dealId, contactId, companyId')
      .eq('projectId', id)
      .order('dueDate', { ascending: true, nullsFirst: false })
      .order('createdAt', { ascending: false })
    projectTasks = tasks ?? []

    // Rechnungen zum verknüpften Deal
    if (project.dealId) {
      const { data: invs } = await supabase
        .from('invoices')
        .select('id, invoiceNumber, status, totalGross, totalPaid, dueDate')
        .eq('dealId', project.dealId)
        .order('createdAt', { ascending: false })
      projectInvoices = invs ?? []
    }
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Projekt laden" err={err} />
  }

  const status = project.status as ProjectStatus

  try {
    return (
      <div className="flex-1 overflow-auto">
        <Header
          title={project.name}
          profile={profile}
          actions={
            <div className="flex items-center gap-2">
              <HandoverProtocolTrigger projectId={id} projectName={project.name} />
              {protocol && (
                <AcceptanceProtocolTrigger
                  protocol={protocol}
                  projectId={id}
                  projectName={project.name}
                  teamMembers={tmRes.data ?? []}
                  buildTeams={buildTeams}
                  currentUserId={currentUserId ?? undefined}
                />
              )}
              <Link href={`/projects/${id}/edit`}
                className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                <Pencil className="w-4 h-4 mr-2" />Bearbeiten
              </Link>
            </div>
          }
        />
        <main className="p-6 grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <Card>
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1 text-xs rounded-full border font-medium ${STATUS_BADGE[status]}`}>
                    {STATUS_LABEL[status]}
                  </span>
                  {project.startDate && (
                    <div className="text-xs text-slate-500">
                      Start: <span className="font-medium text-slate-700">{formatDate(project.startDate)}</span>
                    </div>
                  )}
                  {project.plannedEndDate && (
                    <div className="text-xs text-slate-500">
                      Datum Übergabe: <span className="font-medium text-slate-700">{formatDate(project.plannedEndDate)}</span>
                    </div>
                  )}
                  {project.actualEndDate && (
                    <div className="text-xs text-slate-500">
                      Tats. Ende: <span className="text-emerald-700">{formatDate(project.actualEndDate)}</span>
                    </div>
                  )}
                </div>
                <ProjectStatusActions projectId={id} currentStatus={status} />
              </CardContent>
            </Card>

            {project.description && (
              <Card>
                <CardHeader><CardTitle className="text-base">Beschreibung</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap text-slate-700">{project.description}</p>
                </CardContent>
              </Card>
            )}

            <MilestonesCard projectId={id} milestones={project.milestones ?? []} />

            <MaterialChecklistCard projectId={id} items={project.materialItems ?? []} />

            <PunchListCard projectId={id} items={project.punchItems ?? []} />

            {projectTasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Aufgaben ({projectTasks.length})</span>
                    <Link href={`/tasks/new?projectId=${id}`}
                      className="text-xs text-blue-600 hover:underline">+ Neue Aufgabe</Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {projectTasks.map((t: any) => (
                      <li key={t.id}>
                        <Link href={`/tasks/${t.id}/edit`}
                          className="flex items-center justify-between p-3 hover:bg-slate-50">
                          <span className={t.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900'}>
                            {t.title}
                          </span>
                          <span className="text-xs text-slate-500">
                            {t.dueDate ? formatDate(t.dueDate) : '—'}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {(project.locationStreet || project.locationCity) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />Installations-Ort
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {project.locationStreet && <p>{project.locationStreet}</p>}
                  {(project.locationZip || project.locationCity) && (
                    <p>{[project.locationZip, project.locationCity].filter(Boolean).join(' ')}</p>
                  )}
                  {project.locationCountry && <p className="text-slate-500">{project.locationCountry}</p>}
                </CardContent>
              </Card>
            )}

            {project.notes && (
              <Card>
                <CardHeader><CardTitle className="text-base">Notizen</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap text-slate-700">{project.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <ProjectAttachmentsCard projectId={id} initialAttachments={attachments} dealAttachments={dealAttachments} />

            <ProjectPhotoGallery
              photos={attachments.filter((a: any) => a.mimeType?.startsWith('image/'))}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />Kunde
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {project.company ? (
                  <Link href={`/companies/${project.company.id}`}
                    className="font-medium text-blue-600 hover:underline block">
                    {project.company.name}
                  </Link>
                ) : <p className="text-slate-400">Keine Firma verknüpft</p>}
                {project.contact && (
                  <Link href={`/contacts/${project.contact.id}`}
                    className="flex items-center gap-2 text-slate-700 hover:text-blue-600">
                    <User className="w-3 h-3" />
                    {project.contact.firstName} {project.contact.lastName}
                  </Link>
                )}
                {project.contact?.email && (
                  <a href={`mailto:${project.contact.email}`}
                    className="flex items-center gap-2 text-blue-600 hover:underline text-xs">
                    <Mail className="w-3 h-3" />{project.contact.email}
                  </a>
                )}
                {project.contact?.phone && (
                  <a href={`tel:${project.contact.phone}`}
                    className="flex items-center gap-2 text-slate-600 text-xs">
                    <Phone className="w-3 h-3" />{project.contact.phone}
                  </a>
                )}
              </CardContent>
            </Card>

            {project.teamMember && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600" />SCC-Projektleiter
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="font-medium text-slate-900">
                    {project.teamMember.firstName} {project.teamMember.lastName}
                  </p>
                  {project.teamMember.position && <p className="text-slate-500 text-xs">{project.teamMember.position}</p>}
                  {project.teamMember.email && (
                    <a href={`mailto:${project.teamMember.email}`}
                      className="flex items-center gap-2 text-blue-600 hover:underline text-xs">
                      <Mail className="w-3 h-3" />{project.teamMember.email}
                    </a>
                  )}
                  {project.teamMember.mobile && (
                    <a href={`tel:${project.teamMember.mobile}`}
                      className="flex items-center gap-2 text-slate-600 text-xs">
                      <Phone className="w-3 h-3" />{project.teamMember.mobile}
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {project.buildTeam && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <HardHat className="w-4 h-4 text-orange-500" />Bauteam
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <Link href={`/build-teams/${project.buildTeam.id}`}
                    className="font-medium text-blue-600 hover:underline">
                    {project.buildTeam.name}
                  </Link>
                </CardContent>
              </Card>
            )}

            {project.deal && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />Verknüpfter Deal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/deals/${project.deal.id}`}
                    className="block text-sm text-blue-600 hover:underline">
                    {project.deal.title}
                  </Link>
                  {project.deal.value && (
                    <p className="text-xs text-slate-500 mt-1">
                      Wert: {formatCurrency(Number(project.deal.value), project.deal.currency ?? 'EUR')}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {projectInvoices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-slate-400" />Rechnungen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {projectInvoices.map((inv: any) => (
                      <li key={inv.id}>
                        <Link href={`/invoices/${inv.id}`}
                          className="block p-2 -mx-2 rounded hover:bg-slate-50 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-blue-600">{inv.invoiceNumber}</span>
                            <span className="capitalize text-xs text-slate-500">{inv.status}</span>
                          </div>
                          <p className="font-medium">{formatCurrency(Number(inv.totalGross), 'EUR')}</p>
                          {Number(inv.totalPaid) > 0 && (
                            <p className="text-xs text-emerald-700">
                              bezahlt: {formatCurrency(Number(inv.totalPaid), 'EUR')}
                            </p>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Status-Mail an Kunden */}
            {project.contact?.email && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="w-4 h-4 text-slate-400" />Status-Mail
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={`mailto:${project.contact.email}?subject=${encodeURIComponent(`Projektupdate: ${project.name}`)}&body=${encodeURIComponent(
                      `Guten Tag${project.contact ? ` ${project.contact.firstName} ${project.contact.lastName}` : ''},\n\nwir möchten Sie über den aktuellen Stand Ihres Projekts „${project.name}" informieren.\n\nAktueller Status: ${STATUS_LABEL[project.status as ProjectStatus]}\n\nBei Fragen stehen wir Ihnen gerne zur Verfügung.\n\nMit freundlichen Grüßen\nIhr SCC Courts Team`
                    )}`}
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    E-Mail an {project.contact.firstName} {project.contact.lastName}
                  </a>
                </CardContent>
              </Card>
            )}

            <ShareLinkPanel projectId={id} currentToken={project.shareToken ?? null} currentPassword={project.shareLinkPassword ?? null} />

            <NoteComposer entityType="project" entityId={id} />
            <ActivityTimeline items={activities} currentUserId={currentUserId ?? undefined} />
          </div>
        </main>
      </div>
    )
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Projekt rendern" err={err} />
  }
}
