// components/acceptance/SignatureModal.tsx
'use client'
import { useRef, useEffect, useState } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  onSave: (dataUrl: string | null) => void
  onClose: () => void
}

export function SignatureModal({ onSave, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  function getPoint(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const pt = getPoint(e)
    if (!pt) return
    setDrawing(true)
    setIsEmpty(false)
    lastPoint.current = pt
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) { ctx.beginPath(); ctx.moveTo(pt.x, pt.y) }
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!drawing) return
    const pt = getPoint(e)
    if (!pt) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !lastPoint.current) return
    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()
    lastPoint.current = pt
  }

  function endDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    setDrawing(false)
    lastPoint.current = null
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
  }

  function save() {
    const canvas = canvasRef.current
    if (!canvas || isEmpty) { onSave(null); return }
    onSave(canvas.toDataURL('image/png'))
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h2 className="font-semibold text-slate-900">Unterschrift</h2>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100">
          <X className="w-5 h-5 text-slate-600" />
        </button>
      </div>
      <p className="text-xs text-slate-500 text-center py-2">Bitte hier unterschreiben</p>
      <div className="flex-1 px-4 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={600}
          height={300}
          className="w-full max-w-lg border-2 border-dashed border-slate-300 rounded-xl touch-none"
          style={{ cursor: 'crosshair' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div className="p-4 flex gap-3 border-t border-slate-200">
        <Button variant="outline" size="sm" onClick={clear}>
          <RotateCcw className="w-4 h-4 mr-1" /> Löschen
        </Button>
        <Button onClick={save} className="flex-1" disabled={isEmpty}>
          Unterschrift speichern
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onSave(null)}>
          Überspringen
        </Button>
      </div>
    </div>
  )
}
