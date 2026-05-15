'use client'
import { useState, useTransition } from 'react'
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, useSensor, useSensors,
  useDroppable,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ProjectKanbanCard, type ProjectCardData } from './ProjectKanbanCard'
import { updateProjectStatus } from '@/lib/actions/projects.actions'
import type { ProjectStatus } from '@/lib/db/projects'

const COLUMNS: { status: ProjectStatus; label: string; color: string; headerBg: string }[] = [
  { status: 'planning',     label: 'Planung',           color: 'border-blue-300',   headerBg: 'bg-blue-50' },
  { status: 'ordered',      label: 'Bestellt',          color: 'border-violet-300', headerBg: 'bg-violet-50' },
  { status: 'installation', label: 'Installation',      color: 'border-amber-300',  headerBg: 'bg-amber-50' },
  { status: 'completed',    label: 'Abgeschlossen',     color: 'border-emerald-300',headerBg: 'bg-emerald-50' },
  { status: 'on_hold',      label: 'Pausiert',          color: 'border-slate-300',  headerBg: 'bg-slate-50' },
  { status: 'cancelled',    label: 'Storniert',         color: 'border-red-200',    headerBg: 'bg-red-50' },
]

function KanbanColumn({
  status, label, color, headerBg, projects,
}: { status: string; label: string; color: string; headerBg: string; projects: ProjectCardData[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className={`flex flex-col rounded-xl border-2 ${color} min-h-[200px] ${isOver ? 'ring-2 ring-blue-400' : ''}`}>
      <div className={`px-3 py-2 ${headerBg} rounded-t-xl border-b flex items-center justify-between`}>
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        <span className="text-xs text-slate-500 bg-white/70 rounded-full px-2 py-0.5">{projects.length}</span>
      </div>
      <div ref={setNodeRef} className="flex-1 p-2 space-y-2 min-h-[120px]">
        <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {projects.map((p) => <ProjectKanbanCard key={p.id} project={p} />)}
        </SortableContext>
        {projects.length === 0 && (
          <p className="text-xs text-slate-300 text-center pt-6">Keine Projekte</p>
        )}
      </div>
    </div>
  )
}

interface Props {
  initialProjects: ProjectCardData[]
}

export function ProjectKanbanBoard({ initialProjects }: Props) {
  const [projects, setProjects] = useState(initialProjects)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string)
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return

    const project = projects.find((p) => p.id === active.id)
    if (!project) return

    const isColumnId = COLUMNS.some((c) => c.status === over.id)
    const newStatus = isColumnId
      ? (over.id as ProjectStatus)
      : projects.find((p) => p.id === over.id)?.status as ProjectStatus | undefined

    if (!newStatus || newStatus === project.status) return

    setProjects((prev) => prev.map((p) => p.id === project.id ? { ...p, status: newStatus } : p))
    startTransition(async () => {
      await updateProjectStatus(project.id, newStatus)
    })
  }

  const activeProject = projects.find((p) => p.id === activeId)

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-6 gap-3">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            {...col}
            projects={projects.filter((p) => p.status === col.status)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeProject && <ProjectKanbanCard project={activeProject} isOverlay />}
      </DragOverlay>
    </DndContext>
  )
}
