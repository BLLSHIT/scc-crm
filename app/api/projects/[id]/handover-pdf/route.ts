import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import { HandoverPDFDocument } from '@/lib/pdf/HandoverPDFDocument'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return new NextResponse('Unauthorized', { status: 401 })

  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        id, name, status, startDate, plannedEndDate, actualEndDate,
        locationStreet, locationZip, locationCity, locationCountry,
        company:companies(id, name),
        teamMember:team_members(id, firstName, lastName)
      `)
      .eq('id', id)
      .single()
    if (error || !project) return new NextResponse('Nicht gefunden', { status: 404 })

    const [milestonesRes, punchRes, materialRes] = await Promise.all([
      supabase.from('project_milestones').select('*').eq('projectId', id)
        .order('sortOrder', { ascending: true }),
      supabase.from('project_punch_items').select('*').eq('projectId', id)
        .order('sortOrder', { ascending: true }),
      supabase.from('project_material_items').select('*').eq('projectId', id)
        .order('sortOrder', { ascending: true }),
    ])

    const fullProject = {
      ...project,
      milestones: milestonesRes.data ?? [],
      punchItems: punchRes.data ?? [],
      materialItems: materialRes.data ?? [],
    }

    const generatedAt = new Date().toLocaleDateString('de-DE')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      createElement(HandoverPDFDocument, { project: fullProject, generatedAt }) as any
    )

    const filename = `uebergabe_${(project.name ?? 'projekt').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[handover-pdf]', err)
    return new NextResponse('PDF-Fehler', { status: 500 })
  }
}
