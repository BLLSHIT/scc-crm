'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Package, CheckCircle2, Circle, Truck, Boxes } from 'lucide-react'
import {
  addMaterialItem, toggleMaterialOrdered, toggleMaterialArrived, deleteMaterialItem,
} from '@/lib/actions/projects.actions'
import { ImportTemplateModal } from '@/components/templates/ImportTemplateModal'

interface MaterialItem {
  id: string
  title: string
  quantity?: number | null
  unit?: string | null
  isOrdered: boolean
  isArrived: boolean
  notes?: string | null
  sortOrder: number
}

interface Props {
  projectId: string
  items: MaterialItem[]
}

export function MaterialChecklistCard({ projectId, items }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [notes, setNotes] = useState('')
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  const arrived = items.filter((i) => i.isArrived).length
  const ordered = items.filter((i) => i.isOrdered).length
  const total = items.length

  function handleAdd() {
    if (!title.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addMaterialItem(projectId, {
        title,
        quantity: quantity ? parseFloat(quantity) : undefined,
        unit: unit || undefined,
        notes: notes || undefined,
        sortOrder: 0,
      })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setTitle(''); setQuantity(''); setUnit(''); setNotes(''); setShowForm(false)
      router.refresh()
    })
  }

  function handleToggleOrdered(id: string) {
    startTransition(async () => {
      await toggleMaterialOrdered(id)
      router.refresh()
    })
  }

  function handleToggleArrived(id: string) {
    startTransition(async () => {
      await toggleMaterialArrived(id)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Material-Eintrag löschen?')) return
    startTransition(async () => {
      await deleteMaterialItem(id)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-400" />
            Material ({arrived}/{total} eingetroffen)
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setShowImport(true)}>
              <Boxes className="w-4 h-4 mr-1" />Vorlage laden
            </Button>
            {!showForm && (
              <Button type="button" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" />Material
              </Button>
            )}
          </div>
        </CardTitle>
        {total > 0 && (
          <div className="flex gap-3 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Truck className="w-3 h-3 text-blue-500" />
              {ordered}/{total} bestellt
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              {arrived}/{total} eingetroffen
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
        )}

        {showForm && (
          <div className="rounded-md border border-blue-100 bg-blue-50/40 p-3 space-y-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bezeichnung (z.B. Stahlpfosten 80×80)"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Menge (z.B. 8)"
                min="0"
                step="any"
              />
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Einheit (Stk, m, m², …)"
              />
            </div>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notiz (optional)"
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleAdd}>Hinzufügen</Button>
              <Button type="button" size="sm" variant="outline"
                onClick={() => { setShowForm(false); setTitle(''); setQuantity(''); setUnit(''); setNotes('') }}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-slate-400">Noch keine Material-Einträge.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2 font-medium text-slate-500 text-xs">Bezeichnung</th>
                  <th className="text-right pb-2 font-medium text-slate-500 text-xs px-2">Menge</th>
                  <th className="text-center pb-2 font-medium text-slate-500 text-xs px-2">Bestellt</th>
                  <th className="text-center pb-2 font-medium text-slate-500 text-xs px-2">Eingetr.</th>
                  <th className="w-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50">
                    <td className="py-2">
                      <p className={item.isArrived ? 'line-through text-slate-400' : 'text-slate-900'}>
                        {item.title}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-slate-400">{item.notes}</p>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600 whitespace-nowrap">
                      {item.quantity != null ? (
                        <>{item.quantity}{item.unit ? ` ${item.unit}` : ''}</>
                      ) : '—'}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleOrdered(item.id)}
                        title="Bestellt?"
                        className="text-slate-300 hover:text-blue-500"
                      >
                        {item.isOrdered
                          ? <CheckCircle2 className="w-4 h-4 text-blue-500" />
                          : <Circle className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleArrived(item.id)}
                        title="Eingetroffen?"
                        className="text-slate-300 hover:text-emerald-500"
                      >
                        {item.isArrived
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          : <Circle className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <ImportTemplateModal projectId={projectId} open={showImport} onClose={() => setShowImport(false)} />
    </Card>
  )
}
