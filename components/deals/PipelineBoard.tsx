'use client'
import { useState, useTransition } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { DealColumn } from './DealColumn'
import { DealCard, type DealCardData } from './DealCard'
import { moveDealStage } from '@/lib/actions/deals.actions'

interface Stage {
  id: string
  name: string
  color: string
}

interface PipelineBoardProps {
  stages: Stage[]
  initialDeals: DealCardData[]
}

export function PipelineBoard({ stages, initialDeals }: PipelineBoardProps) {
  const [deals, setDeals] = useState(initialDeals)
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

    const deal = deals.find((d) => d.id === active.id)
    if (!deal) return

    // `over` can be a stage column or another deal card
    const isStageId = stages.some((s) => s.id === over.id)
    const newStageId = isStageId
      ? (over.id as string)
      : deals.find((d) => d.id === over.id)?.stageId

    if (!newStageId || newStageId === deal.stageId) return

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) => (d.id === deal.id ? { ...d, stageId: newStageId } : d))
    )

    startTransition(async () => {
      await moveDealStage(deal.id, newStageId)
    })
  }

  const activeDeal = deals.find((d) => d.id === activeId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {stages.map((stage) => (
          <DealColumn
            key={stage.id}
            stage={stage}
            deals={deals.filter((d) => d.stageId === stage.id)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
