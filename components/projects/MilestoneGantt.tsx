'use client'
import { useRef, useState, useMemo } from 'react'

export interface GanttMilestone {
  id: string
  title: string
  startDate?: string | null
  dueDate?: string | null
  completedAt?: string | null
}

interface Props {
  milestones: GanttMilestone[]
  scale: 'kw' | 'mon'
  onDatesChange: (id: string, startDate: string | null, dueDate: string) => void
}

type DragState = {
  type: 'move' | 'left' | 'right'
  milestoneId: string
  startX: number
  origStart: Date | null
  origDue: Date
}

// ─── Date helpers ───────────────────────────────────────────────────────────
function isoToDate(s: string): Date { return new Date(s + 'T00:00:00') }
function dateToIso(d: Date): string { return d.toISOString().split('T')[0] }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function addMonths(d: Date, n: number): Date { const r = new Date(d); r.setMonth(r.getMonth() + n); return r }

function startOfWeek(d: Date): Date {
  const r = new Date(d)
  const day = r.getDay()
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1))
  r.setHours(0, 0, 0, 0)
  return r
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function isoWeek(d: Date): number {
  const thu = new Date(d)
  thu.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const jan1 = new Date(thu.getFullYear(), 0, 1)
  return Math.ceil(((thu.getTime() - jan1.getTime()) / 86400000 + 1) / 7)
}

function monthLabel(d: Date): string {
  return d.toLocaleString('de-DE', { month: 'short', year: '2-digit' })
}

function shiftDate(d: Date, n: number, scale: 'kw' | 'mon'): Date {
  return scale === 'kw' ? addDays(d, n * 7) : addMonths(d, n)
}

// ─── Column helpers ─────────────────────────────────────────────────────────
function buildColumns(milestones: GanttMilestone[], scale: 'kw' | 'mon'): Date[] {
  const dates: Date[] = []
  for (const m of milestones) {
    if (m.startDate) dates.push(isoToDate(m.startDate))
    if (m.dueDate) dates.push(isoToDate(m.dueDate))
  }
  const now = new Date()
  if (dates.length === 0) {
    dates.push(addMonths(now, -1), addMonths(now, 3))
  }
  const min = new Date(Math.min(...dates.map(d => d.getTime())))
  const max = new Date(Math.max(...dates.map(d => d.getTime())))
  const bufStart = scale === 'kw' ? addDays(min, -14) : addMonths(min, -1)
  const bufEnd   = scale === 'kw' ? addDays(max, 21)  : addMonths(max, 2)

  const cols: Date[] = []
  if (scale === 'kw') {
    let cur = startOfWeek(bufStart)
    while (cur <= bufEnd) { cols.push(new Date(cur)); cur = addDays(cur, 7) }
  } else {
    let cur = startOfMonth(bufStart)
    while (cur <= bufEnd) { cols.push(new Date(cur)); cur = addMonths(cur, 1) }
  }
  return cols
}

// Dates outside the range clamp silently to the nearest edge column.
function dateToColIdx(d: Date, columns: Date[], scale: 'kw' | 'mon'): number {
  const target = (scale === 'kw' ? startOfWeek(d) : startOfMonth(d)).getTime()
  const idx = columns.findIndex(c => c.getTime() === target)
  return Math.max(0, idx >= 0 ? idx : columns.length - 1)
}

const LABEL_PX = 130

// ─── Component ──────────────────────────────────────────────────────────────
export function MilestoneGantt({ milestones, scale, onDatesChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [visualDx, setVisualDx] = useState(0)

  const columns = useMemo(() => buildColumns(milestones, scale), [milestones, scale])
  const todayCol = dateToColIdx(new Date(), columns, scale)

  function colWidth(): number {
    if (!containerRef.current) return 40
    return (containerRef.current.clientWidth - LABEL_PX) / columns.length
  }

  function startDrag(e: React.PointerEvent, type: DragState['type'], m: GanttMilestone) {
    if (m.completedAt) return
    e.currentTarget.setPointerCapture(e.pointerId)
    e.stopPropagation()
    dragRef.current = {
      type,
      milestoneId: m.id,
      startX: e.clientX,
      origStart: m.startDate ? isoToDate(m.startDate) : null,
      origDue: m.dueDate ? isoToDate(m.dueDate) : new Date(),
    }
    setDraggingId(m.id)
    setVisualDx(0)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    setVisualDx(e.clientX - dragRef.current.startX)
  }

  function cancelDrag() {
    dragRef.current = null
    setDraggingId(null)
    setVisualDx(0)
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragRef.current) return
    const { type, milestoneId, startX, origStart, origDue } = dragRef.current
    const cw = colWidth()
    const colsDelta = Math.round((e.clientX - startX) / cw)
    cancelDrag()

    if (colsDelta === 0) return

    if (type === 'move') {
      const newStart = origStart ? shiftDate(origStart, colsDelta, scale) : null
      const newDue = shiftDate(origDue, colsDelta, scale)
      onDatesChange(milestoneId, newStart ? dateToIso(newStart) : null, dateToIso(newDue))
    } else if (type === 'left' && origStart) {
      const newStart = shiftDate(origStart, colsDelta, scale)
      if (newStart <= shiftDate(origDue, -1, scale)) {
        onDatesChange(milestoneId, dateToIso(newStart), dateToIso(origDue))
      }
    } else if (type === 'right') {
      const newDue = shiftDate(origDue, colsDelta, scale)
      const minDue = origStart ? shiftDate(origStart, 1, scale) : origDue
      if (newDue >= minDue) {
        onDatesChange(milestoneId, origStart ? dateToIso(origStart) : null, dateToIso(newDue))
      }
    }
  }

  // CSS grid: column 1 = label (LABEL_PX), columns 2..N+1 = date columns (1fr each)
  const gridCols = `${LABEL_PX}px repeat(${columns.length}, 1fr)`

  return (
    <div
      ref={containerRef}
      className="overflow-x-auto rounded-lg border border-slate-100 touch-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={cancelDrag}
    >
      <div style={{ minWidth: Math.max(500, LABEL_PX + columns.length * 36) }}>
        {/* Header row */}
        <div
          className="grid border-b border-slate-100 pb-1 mb-1 pt-2 px-2"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div />
          {columns.map((col, i) => (
            <div
              key={i}
              className={`text-[9px] font-medium truncate px-0.5 ${
                i === todayCol ? 'text-red-500' : 'text-slate-400'
              }`}
            >
              {scale === 'kw' ? `KW ${isoWeek(col)}` : monthLabel(col)}
            </div>
          ))}
        </div>

        {/* Milestone rows */}
        <div className="px-2 pb-2 relative">
          {todayCol >= 0 && todayCol < columns.length && (
            <div
              className="absolute top-0 bottom-0 w-px bg-red-400/50 pointer-events-none z-10"
              style={{
                left: `calc(${LABEL_PX}px + ${(todayCol + 0.5) / columns.length} * (100% - ${LABEL_PX}px))`,
              }}
            />
          )}
          {milestones.map((m) => {
            const isDone = !!m.completedAt
            const hasRange = !!m.startDate && !!m.dueDate
            const start = m.startDate ? isoToDate(m.startDate) : null
            const due   = m.dueDate   ? isoToDate(m.dueDate)   : null

            const colStart = start ? dateToColIdx(start, columns, scale)
              : due ? dateToColIdx(due, columns, scale) : 0
            const colEnd   = due ? dateToColIdx(due, columns, scale) : colStart
            const colSpan  = Math.max(1, colEnd - colStart + 1)

            const isDragging = draggingId === m.id
            const dx = isDragging ? visualDx : 0

            return (
              <div
                key={m.id}
                className="grid items-center mb-1.5"
                style={{ gridTemplateColumns: gridCols }}
              >
                {/* Label (column 1) */}
                <div className={`text-[10px] pr-2 truncate flex items-center gap-1 ${isDone ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                  <span>{isDone ? '✓' : '○'}</span>
                  <span className="truncate">{m.title}</span>
                </div>

                {/* Empty cells before bar */}
                {colStart > 0 && (
                  <div style={{ gridColumn: `2 / span ${colStart}` }} />
                )}

                {/* Bar or diamond — column index is 1-based in CSS grid, +1 for label col, +1 for base offset = colStart+2 */}
                {hasRange ? (
                  <div
                    style={{
                      gridColumn: `${colStart + 2} / span ${colSpan}`,
                      transform: `translateX(${dx}px)`,
                      touchAction: 'none',
                    }}
                    onPointerDown={(e) => startDrag(e, 'move', m)}
                    className={`h-5 rounded relative flex items-center justify-center select-none ${
                      isDone
                        ? 'bg-emerald-400/60 cursor-default'
                        : 'bg-blue-500 cursor-grab shadow-sm shadow-blue-200'
                    }`}
                  >
                    {!isDone && (
                      <div
                        className="absolute left-1 top-1 w-0.5 h-3 bg-white/60 rounded cursor-ew-resize"
                        onPointerDown={(e) => startDrag(e, 'left', m)}
                      />
                    )}
                    <span className="text-[10px] text-white font-medium truncate px-3 pointer-events-none">
                      {m.startDate?.slice(5)} – {m.dueDate?.slice(5)}
                    </span>
                    {!isDone && (
                      <div
                        className="absolute right-1 top-1 w-0.5 h-3 bg-white/60 rounded cursor-ew-resize"
                        onPointerDown={(e) => startDrag(e, 'right', m)}
                      />
                    )}
                  </div>
                ) : due ? (
                  <div
                    style={{ gridColumn: `${colStart + 2} / span 1` }}
                    className="flex items-center justify-center"
                  >
                    <div
                      className={`w-3 h-3 rotate-45 ${isDone ? 'bg-emerald-400' : 'bg-amber-400'}`}
                      title={m.dueDate ?? ''}
                    />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
