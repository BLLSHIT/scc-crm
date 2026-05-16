'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, Pencil, X, Check } from 'lucide-react'
import { createTemplateSet, updateTemplateSet, deleteTemplateSet } from '@/lib/actions/templates.actions'
import type { TemplateSet, TemplateOptions } from '@/lib/db/templates'

interface Props {
  sets: TemplateSet[]
  options: TemplateOptions
}

interface SetFormState {
  name: string
  description: string
  milestoneTemplateId: string
  punchlistTemplateId: string
  materialTemplateId: string
}

const emptyForm: SetFormState = {
  name: '', description: '', milestoneTemplateId: '', punchlistTemplateId: '', materialTemplateId: '',
}

export function TemplateSetsClient({ sets, options }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SetFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  function startEdit(set: TemplateSet) {
    setEditingId(set.id)
    setForm({
      name: set.name,
      description: set.description ?? '',
      milestoneTemplateId: set.milestoneTemplateId ?? '',
      punchlistTemplateId: set.punchlistTemplateId ?? '',
      materialTemplateId: set.materialTemplateId ?? '',
    })
  }

  function handleCreate() {
    if (!form.name.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await createTemplateSet({
        name: form.name, description: form.description,
        milestoneTemplateId: form.milestoneTemplateId || undefined,
        punchlistTemplateId: form.punchlistTemplateId || undefined,
        materialTemplateId: form.materialTemplateId || undefined,
      })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setShowCreate(false); setForm(emptyForm); router.refresh()
    })
  }

  function handleUpdate(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await updateTemplateSet(id, {
        name: form.name, description: form.description,
        milestoneTemplateId: form.milestoneTemplateId || undefined,
        punchlistTemplateId: form.punchlistTemplateId || undefined,
        materialTemplateId: form.materialTemplateId || undefined,
      })
      if (result.error) { setError(result.error._form?.[0] ?? 'Fehler.'); return }
      setEditingId(null); router.refresh()
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Set „${name}" wirklich löschen?`)) return
    startTransition(async () => {
      await deleteTemplateSet(id)
      router.refresh()
    })
  }

  function SetFormFields() {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="z.B. Standard Padel Court" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Beschreibung</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Meilensteine</label>
            <select className="w-full border rounded-lg px-2 py-2 text-sm"
              value={form.milestoneTemplateId} onChange={(e) => setForm((f) => ({ ...f, milestoneTemplateId: e.target.value }))}>
              <option value="">— keine —</option>
              {options.milestones.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Checkliste</label>
            <select className="w-full border rounded-lg px-2 py-2 text-sm"
              value={form.punchlistTemplateId} onChange={(e) => setForm((f) => ({ ...f, punchlistTemplateId: e.target.value }))}>
              <option value="">— keine —</option>
              {options.punchlists.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Material</label>
            <select className="w-full border rounded-lg px-2 py-2 text-sm"
              value={form.materialTemplateId} onChange={(e) => setForm((f) => ({ ...f, materialTemplateId: e.target.value }))}>
              <option value="">— keine —</option>
              {options.materials.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {sets.map((set) => (
        <div key={set.id} className="bg-white rounded-xl border p-4">
          {editingId === set.id ? (
            <div className="space-y-3">
              <SetFormFields />
              <div className="flex gap-2">
                <button onClick={() => handleUpdate(set.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                  <Check className="w-3.5 h-3.5" /> Speichern
                </button>
                <button onClick={() => setEditingId(null)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border text-sm rounded-lg hover:bg-slate-50">
                  <X className="w-3.5 h-3.5" /> Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{set.name}</h3>
                {set.description && <p className="text-xs text-slate-500 mt-0.5">{set.description}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {set.milestoneTemplate && (
                    <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full">
                      📍 {set.milestoneTemplate.name}
                    </span>
                  )}
                  {set.punchlistTemplate && (
                    <span className="px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700 rounded-full">
                      ✓ {set.punchlistTemplate.name}
                    </span>
                  )}
                  {set.materialTemplate && (
                    <span className="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded-full">
                      📦 {set.materialTemplate.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(set)} className="text-slate-400 hover:text-slate-700 p-1">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(set.id, set.name)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {showCreate ? (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-medium text-slate-900">Neues Set</h3>
          <SetFormFields />
          <div className="flex gap-2">
            <button onClick={handleCreate}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              <Check className="w-3.5 h-3.5" /> Erstellen
            </button>
            <button onClick={() => { setShowCreate(false); setForm(emptyForm) }}
              className="inline-flex items-center gap-1 px-3 py-1.5 border text-sm rounded-lg hover:bg-slate-50">
              <X className="w-3.5 h-3.5" /> Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-dashed rounded-xl text-slate-500 hover:text-slate-700 hover:border-slate-400 w-full justify-center text-sm">
          <Plus className="w-4 h-4" /> Neues Set anlegen
        </button>
      )}
    </div>
  )
}
