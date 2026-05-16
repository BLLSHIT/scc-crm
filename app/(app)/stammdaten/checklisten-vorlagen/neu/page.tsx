'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPunchlistTemplate } from '@/lib/actions/templates.actions'

export default function NewPunchlistTemplatePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createPunchlistTemplate({ name, description })
      if (result.error) { setError(result.error._form?.[0] ?? result.error.name?.[0] ?? 'Fehler.'); return }
      if (result.redirectTo) router.push(result.redirectTo)
    })
  }

  return (
    <div className="flex-1 p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-4">Neue Checklisten-Vorlage</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border p-6">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={name}
            onChange={(e) => setName(e.target.value)} placeholder="z.B. Standard Abnahme" autoFocus required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Beschreibung</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm" value={description}
            onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Erstellen</button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border text-sm rounded-lg hover:bg-slate-50">Abbrechen</button>
        </div>
      </form>
    </div>
  )
}
