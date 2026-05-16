'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus } from 'lucide-react'
import {
  updateMilestoneTemplate, deleteMilestoneTemplate,
  addMilestoneTemplateItem, deleteMilestoneTemplateItem,
} from '@/lib/actions/templates.actions'
import type { MilestoneTemplate } from '@/lib/db/templates'

export function MilestoneTemplateDetail({ template }: { template: MilestoneTemplate }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? '')
  const [editingHeader, setEditingHeader] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSaveHeader() {
    startTransition(async () => {
      const result = await updateMilestoneTemplate(template.id, { name, description })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setEditingHeader(false)
      router.refresh()
    })
  }

  function handleDelete() {
    if (!confirm(`Vorlage „${template.name}" wirklich löschen?`)) return
    startTransition(async () => {
      await deleteMilestoneTemplate(template.id)
      router.push('/stammdaten/meilenstein-vorlagen')
    })
  }

  function handleAddItem() {
    if (!newTitle.trim()) return
    startTransition(async () => {
      const result = await addMilestoneTemplateItem(template.id, { title: newTitle, description: newDesc })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setNewTitle(''); setNewDesc('')
      router.refresh()
    })
  }

  function handleDeleteItem(itemId: string) {
    startTransition(async () => {
      await deleteMilestoneTemplateItem(itemId, template.id)
      router.refresh()
    })
  }

  return (
    <div className="flex-1 p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        {editingHeader ? (
          <div className="flex-1 space-y-2">
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm font-semibold"
              value={name} onChange={(e) => setName(e.target.value)} autoFocus
            />
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            />
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
        <button onClick={handleDelete} className="text-red-500 hover:text-red-700 p-1" title="Vorlage löschen">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Item List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 text-sm font-medium text-slate-600">
          Einträge ({template.items.length})
        </div>
        {template.items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-400">Noch keine Einträge.</p>
        ) : (
          <ul className="divide-y">
            {template.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 group hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">{item.title}</p>
                  {item.description && <p className="text-xs text-slate-400">{item.description}</p>}
                </div>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add item form */}
        <div className="px-4 py-3 border-t bg-slate-50 space-y-2">
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Neuer Eintrag (Titel)"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem() } }}
          />
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Beschreibung (optional)"
          />
          <button
            onClick={handleAddItem}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" /> Eintrag hinzufügen
          </button>
        </div>
      </div>
    </div>
  )
}
