'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus } from 'lucide-react'
import {
  updateMaterialTemplate, deleteMaterialTemplate,
  addMaterialTemplateItem, deleteMaterialTemplateItem,
} from '@/lib/actions/templates.actions'
import type { MaterialTemplate } from '@/lib/db/templates'

export function MaterialTemplateDetail({ template }: { template: MaterialTemplate }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? '')
  const [editingHeader, setEditingHeader] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSaveHeader() {
    startTransition(async () => {
      const result = await updateMaterialTemplate(template.id, { name, description })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setEditingHeader(false); router.refresh()
    })
  }

  function handleDelete() {
    if (!confirm(`Vorlage „${template.name}" wirklich löschen?`)) return
    startTransition(async () => {
      await deleteMaterialTemplate(template.id)
      router.push('/stammdaten/material-vorlagen')
    })
  }

  function handleAddItem() {
    if (!newTitle.trim()) return
    startTransition(async () => {
      const result = await addMaterialTemplateItem(template.id, {
        title: newTitle,
        quantity: newQty ? parseFloat(newQty) : undefined,
        unit: newUnit || undefined,
        notes: newNotes || undefined,
      })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setNewTitle(''); setNewQty(''); setNewUnit(''); setNewNotes('')
      router.refresh()
    })
  }

  function handleDeleteItem(itemId: string) {
    startTransition(async () => {
      await deleteMaterialTemplateItem(itemId, template.id)
      router.refresh()
    })
  }

  return (
    <div className="flex-1 p-6 max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        {editingHeader ? (
          <div className="flex-1 space-y-2">
            <input className="w-full border rounded-lg px-3 py-2 text-sm font-semibold"
              value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm"
              value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <button onClick={handleSaveHeader} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg">Speichern</button>
              <button onClick={() => setEditingHeader(false)} className="px-3 py-1.5 border text-sm rounded-lg">Abbrechen</button>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{template.name}</h1>
            {template.description && <p className="text-sm text-slate-500 mt-1">{template.description}</p>}
            <button onClick={() => setEditingHeader(true)} className="text-xs text-blue-600 hover:underline mt-1">Bearbeiten</button>
          </div>
        )}
        <button onClick={handleDelete} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 text-sm font-medium text-slate-600">
          Einträge ({template.items.length})
        </div>
        {template.items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-400">Noch keine Einträge.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Bezeichnung</th>
                <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium w-20">Menge</th>
                <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium w-20">Einheit</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {template.items.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <p className="text-slate-900">{item.title}</p>
                    {item.notes && <p className="text-xs text-slate-400">{item.notes}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{item.quantity ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{item.unit ?? '—'}</td>
                  <td className="px-2 py-2.5">
                    <button onClick={() => handleDeleteItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="px-4 py-3 border-t bg-slate-50 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <input className="col-span-1 border rounded-lg px-3 py-2 text-sm" value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)} placeholder="Bezeichnung *" />
            <input className="border rounded-lg px-3 py-2 text-sm" value={newQty}
              onChange={(e) => setNewQty(e.target.value)} placeholder="Menge" type="number" min="0" step="any" />
            <input className="border rounded-lg px-3 py-2 text-sm" value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)} placeholder="Einheit" />
          </div>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)} placeholder="Notizen (optional)" />
          <button onClick={handleAddItem}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            <Plus className="w-3.5 h-3.5" /> Eintrag hinzufügen
          </button>
        </div>
      </div>
    </div>
  )
}
