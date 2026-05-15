// app/approve/[token]/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from 'next/navigation'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react'
import { submitRemoteApproval } from '@/lib/actions/acceptance-protocol.actions'

const STATUS_LABEL: Record<string, string> = {
  ok: 'OK',
  defect: 'Mangel',
  not_checked: 'Nicht geprüft',
}
const PRIORITY_LABEL: Record<string, string> = { low: 'leicht', medium: 'mittel', critical: 'kritisch' }

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE')
}

async function getApprovalData(token: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !supabaseUrl) return null

  const admin = createSupabaseAdmin(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: phase } = await admin
    .from('acceptance_phases')
    .select('*, protocol:acceptance_protocols(projectId, project:projects(name))')
    .eq('remoteApprovalToken', token)
    .single()
  if (!phase) return null

  const { data: items } = await admin
    .from('acceptance_items')
    .select('*, assignee:team_members!assigneeId(id, firstName, lastName)')
    .eq('phaseId', phase.id)
    .order('sortOrder', { ascending: true })

  const itemsWithPhotos = await Promise.all(
    (items ?? []).map(async (item: any) => {
      const { data: photos } = await admin
        .from('acceptance_item_photos')
        .select('*')
        .eq('itemId', item.id)

      // Generate signed URLs
      const photosWithUrls = await Promise.all(
        (photos ?? []).map(async (photo: any) => {
          const { data: signed } = await admin.storage
            .from('project-attachments')
            .createSignedUrl(photo.storagePath, 3600)
          return { ...photo, signedUrl: signed?.signedUrl ?? null }
        })
      )
      return { ...item, photos: photosWithUrls }
    })
  )

  return {
    phase,
    items: itemsWithPhotos,
    projectName: (phase.protocol as any)?.project?.name ?? '',
  }
}

export default async function ApprovePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await getApprovalData(token)
  if (!data) notFound()

  const { phase, items, projectName } = data
  const isAlreadyApproved = !!phase.remoteApprovedAt
  const defects = items.filter((i: any) => i.status === 'defect')

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-xs text-slate-400 mb-1">Abnahmeprotokoll</p>
          <h1 className="text-xl font-bold text-slate-900">{phase.name}</h1>
          <p className="text-sm text-slate-600 mt-1">{projectName}</p>
          {phase.completedAt && (
            <p className="text-xs text-slate-400 mt-2">
              Abgeschlossen am {formatDate(phase.completedAt)}
            </p>
          )}
        </div>

        {/* Already approved */}
        {isAlreadyApproved && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <p className="font-semibold text-emerald-800">Abnahme bestätigt</p>
            <p className="text-sm text-emerald-700 mt-1">
              {phase.remoteApprovedByName} · {formatDate(phase.remoteApprovedAt)}
            </p>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Prüfpunkte ({items.length})</h2>
          {items.map((item: any) => (
            <div key={item.id} className={`rounded-xl border p-3 ${
              item.status === 'ok'    ? 'border-emerald-200 bg-emerald-50' :
              item.status === 'defect'? 'border-orange-200 bg-orange-50'  :
                                        'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-start gap-2">
                {item.status === 'ok'
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  : item.status === 'defect'
                  ? <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  {item.status === 'defect' && item.priority && (
                    <p className="text-xs text-orange-600 mt-0.5">Priorität: {PRIORITY_LABEL[item.priority]}</p>
                  )}
                  {item.notes && <p className="text-xs text-slate-500 mt-0.5">{item.notes}</p>}
                  {item.photos?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {item.photos.map((photo: any) => photo.signedUrl && (
                        <img
                          key={photo.id}
                          src={photo.signedUrl}
                          alt={photo.filename}
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                        />
                      ))}
                    </div>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  item.status === 'ok'     ? 'bg-emerald-100 text-emerald-700' :
                  item.status === 'defect' ? 'bg-orange-100 text-orange-700'  :
                                             'bg-slate-100 text-slate-500'
                }`}>
                  {STATUS_LABEL[item.status]}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Mängel summary */}
        {defects.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {defects.length} Mängel dokumentiert
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Diese werden nach der Abnahme behoben.
            </p>
          </div>
        )}

        {/* Approval form — only if not yet approved */}
        {!isAlreadyApproved && (
          <form
            action={async (formData: FormData) => {
              'use server'
              const name = formData.get('approverName') as string
              await submitRemoteApproval(token, name)
            }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4"
          >
            <h2 className="text-sm font-semibold text-slate-700">Abnahme bestätigen</h2>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Ihr Name *</label>
              <input
                name="approverName"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Vor- und Nachname"
              />
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" required className="mt-0.5 w-4 h-4 rounded" />
              <span className="text-sm text-slate-700">
                Hiermit bestätige ich die Abnahme der oben aufgeführten Arbeiten gemäß dem Protokoll.
              </span>
            </label>
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors"
            >
              ✓ Abnahme jetzt bestätigen
            </button>
          </form>
        )}

        <p className="text-center text-xs text-slate-400">
          Erstellt mit SCC Courts CRM · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
