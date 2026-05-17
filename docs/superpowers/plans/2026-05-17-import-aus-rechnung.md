# Import aus Rechnung — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einen zweiten Import-Button "Aus Rechnung" in der Materialliste einbauen, der Produktpositionen einer mit dem Projekt-Deal verknüpften Rechnung als Material-Einträge übernimmt.

**Architecture:** Zwei neue Server-Funktionen in `lib/actions/projects.actions.ts` (`fetchInvoicesForProject` + `importMaterialFromInvoice`) + neue Client-Komponente `ImportFromInvoiceModal` + ein zweiter Button in `MaterialChecklistCard`. Keine neue DB-Tabelle, kein neuer API-Route-Handler.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase JS, Tailwind CSS, Lucide React

---

## File Structure

| Datei | Aktion | Verantwortung |
|-------|--------|---------------|
| `lib/actions/projects.actions.ts` | Modify | `fetchInvoicesForProject` + `importMaterialFromInvoice` + Export-Typ `InvoiceOption` |
| `components/projects/ImportFromInvoiceModal.tsx` | **Neu** | Modal-UI: Rechnungsauswahl, Positionsvorschau, Modus-Wahl, Import-Auslösung |
| `components/projects/MaterialChecklistCard.tsx` | Modify | Zweiter Button im Header + Modal einbinden |

---

## Task 1: Server Actions hinzufügen

**Files:**
- Modify: `lib/actions/projects.actions.ts` (am Ende der Datei anhängen)

Die Datei hat bereits `'use server'`, `randomUUID`, `revalidatePath` und `createClient` importiert — diese nicht doppelt importieren.

- [ ] **Step 1: Datei lesen**

```bash
cat /Users/jhj/scc-crm/lib/actions/projects.actions.ts
```

Sicherstellen, dass `randomUUID` von `'crypto'` importiert wird (bereits vorhanden).

- [ ] **Step 2: Export-Typ und zwei Funktionen am Ende der Datei anhängen**

Füge direkt am Ende von `lib/actions/projects.actions.ts` ein:

```typescript
// ─── Import aus Rechnung ─────────────────────────────────────────────────────

export type InvoiceOption = {
  id: string
  invoiceNumber: string
  title: string
  issueDate: string
  lineItems: {
    name: string
    quantity: number | null
    unit: string | null
    description: string | null
  }[]
}

export async function fetchInvoicesForProject(projectId: string): Promise<InvoiceOption[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: project } = await supabase
    .from('projects').select('dealId').eq('id', projectId).single()
  if (!project?.dealId) return []

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoiceNumber, title, issueDate')
    .eq('dealId', project.dealId)
    .order('issueDate', { ascending: false })
  if (!invoices?.length) return []

  const results: InvoiceOption[] = []
  for (const inv of invoices) {
    const { data: lineItems } = await supabase
      .from('invoice_line_items')
      .select('name, quantity, unit, description')
      .eq('invoiceId', inv.id)
      .eq('itemType', 'product')
      .order('sortOrder', { ascending: true })
    results.push({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      title: inv.title,
      issueDate: inv.issueDate,
      lineItems: lineItems ?? [],
    })
  }
  return results
}

export async function importMaterialFromInvoice(
  projectId: string,
  invoiceId: string,
  mode: 'append' | 'replace',
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _form: ['Nicht autorisiert.'] } }

  const { data: project } = await supabase
    .from('projects').select('dealId').eq('id', projectId).single()
  if (!project) return { error: { _form: ['Projekt nicht gefunden.'] } }

  const { data: invoice } = await supabase
    .from('invoices').select('dealId').eq('id', invoiceId).single()
  if (!invoice || invoice.dealId !== project.dealId) {
    return { error: { _form: ['Rechnung gehört nicht zu diesem Projekt.'] } }
  }

  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('name, quantity, unit, description')
    .eq('invoiceId', invoiceId)
    .eq('itemType', 'product')
    .order('sortOrder', { ascending: true })

  if (!lineItems?.length) {
    return { error: { _form: ['Keine Produktpositionen in dieser Rechnung.'] } }
  }

  if (mode === 'replace') {
    const { error: delError } = await supabase
      .from('project_material_items').delete().eq('projectId', projectId)
    if (delError) return { error: { _form: [delError.message] } }
  }

  const now = new Date().toISOString()
  const { error: insError } = await supabase.from('project_material_items').insert(
    lineItems.map((item, index) => ({
      id: randomUUID(),
      projectId,
      title: item.name.trim(),
      quantity: item.quantity ?? null,
      unit: item.unit?.trim() || null,
      notes: item.description?.trim() || null,
      isOrdered: false,
      isArrived: false,
      sortOrder: index,
      updatedAt: now,
    }))
  )
  if (insError) return { error: { _form: [insError.message] } }

  revalidatePath(`/projects/${projectId}`)
  return {}
}
```

- [ ] **Step 3: TypeScript-Build prüfen**

```bash
cd /Users/jhj/scc-crm && npx tsc --noEmit 2>&1; echo "exit:$?"
```

Erwartetes Ergebnis: `exit:0`

- [ ] **Step 4: Commit**

```bash
cd /Users/jhj/scc-crm
git add lib/actions/projects.actions.ts
git commit -m "feat: add fetchInvoicesForProject and importMaterialFromInvoice actions"
```

---

## Task 2: ImportFromInvoiceModal erstellen

**Files:**
- Create: `components/projects/ImportFromInvoiceModal.tsx`

- [ ] **Step 1: Datei erstellen**

```typescript
// components/projects/ImportFromInvoiceModal.tsx
'use client'
import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, FileText } from 'lucide-react'
import {
  fetchInvoicesForProject,
  importMaterialFromInvoice,
  type InvoiceOption,
} from '@/lib/actions/projects.actions'

interface Props {
  projectId: string
  open: boolean
  onClose: () => void
}

export function ImportFromInvoiceModal({ projectId, open, onClose }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [invoices, setInvoices] = useState<InvoiceOption[] | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch on open; reset on close so next open re-fetches fresh data
  useEffect(() => {
    if (open) {
      setInvoices(null)
      setSelectedId('')
      setImportMode('append')
      setError(null)
      fetchInvoicesForProject(projectId).then(setInvoices)
    }
  }, [open, projectId])

  // Auto-select when only one invoice
  const selected: InvoiceOption | null =
    invoices?.find((inv) => inv.id === selectedId) ??
    (invoices?.length === 1 ? invoices[0] : null)
  const effectiveId = selected?.id ?? ''

  const canImport = !!effectiveId && !loading

  function handleImport() {
    if (!canImport) return
    setError(null)
    setLoading(true)
    startTransition(async () => {
      const result = await importMaterialFromInvoice(projectId, effectiveId, importMode)
      setLoading(false)
      if (result.error) {
        setError(result.error._form?.[0] ?? 'Fehler beim Import.')
        return
      }
      router.refresh()
      onClose()
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Aus Rechnung importieren</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading */}
        {invoices === null && (
          <p className="text-sm text-slate-400">Rechnungen werden geladen…</p>
        )}

        {/* Empty state */}
        {invoices !== null && invoices.length === 0 && (
          <div className="text-center py-6">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-700">Keine Rechnungen gefunden</p>
            <p className="text-xs text-slate-400 mt-1">
              Diesem Projekt ist kein Deal mit Rechnungen verknüpft.
            </p>
          </div>
        )}

        {/* Main content */}
        {invoices !== null && invoices.length > 0 && (
          <>
            {/* Invoice picker — only shown when multiple */}
            {invoices.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rechnung auswählen
                </label>
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <label
                      key={inv.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedId === inv.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="invoice"
                        value={inv.id}
                        checked={selectedId === inv.id}
                        onChange={() => setSelectedId(inv.id)}
                        className="mt-0.5 accent-blue-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {inv.invoiceNumber} — {inv.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {inv.lineItems.length} Produktposition{inv.lineItems.length !== 1 ? 'en' : ''} · {inv.issueDate}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Position preview */}
            {selected && (
              <>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    {selected.lineItems.length} Position{selected.lineItems.length !== 1 ? 'en' : ''} werden importiert
                  </p>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[1fr_60px_60px] bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide">
                      <span>Bezeichnung</span>
                      <span>Menge</span>
                      <span>Einheit</span>
                    </div>
                    {selected.lineItems.slice(0, 3).map((item, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_60px_60px] px-3 py-2 text-sm border-t border-slate-100"
                      >
                        <span className="text-slate-900 truncate">{item.name}</span>
                        <span className="text-slate-600">{item.quantity ?? '—'}</span>
                        <span className="text-slate-600">{item.unit ?? '—'}</span>
                      </div>
                    ))}
                    {selected.lineItems.length > 3 && (
                      <div className="px-3 py-2 text-xs text-slate-400 border-t border-slate-100 italic">
                        + {selected.lineItems.length - 3} weitere…
                      </div>
                    )}
                  </div>
                </div>

                {/* Import mode */}
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Import-Modus</p>
                  <div className="flex flex-col gap-2">
                    {(['append', 'replace'] as const).map((m) => (
                      <label key={m} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value={m}
                          checked={importMode === m}
                          onChange={() => setImportMode(m)}
                          className="accent-blue-600"
                        />
                        <span className="text-sm text-slate-700">
                          {m === 'append' ? 'Anhängen' : 'Ersetzen'}
                          <span className="text-slate-400 ml-1 text-xs">
                            {m === 'append'
                              ? '(bestehende Einträge bleiben)'
                              : '(bestehende Einträge werden gelöscht)'}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border text-sm rounded-lg hover:bg-slate-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleImport}
                disabled={!canImport}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Wird importiert…' : 'Importieren'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript-Build prüfen**

```bash
cd /Users/jhj/scc-crm && npx tsc --noEmit 2>&1; echo "exit:$?"
```

Erwartetes Ergebnis: `exit:0`

- [ ] **Step 3: Commit**

```bash
cd /Users/jhj/scc-crm
git add components/projects/ImportFromInvoiceModal.tsx
git commit -m "feat: add ImportFromInvoiceModal component"
```

---

## Task 3: Button und Modal in MaterialChecklistCard einbinden

**Files:**
- Modify: `components/projects/MaterialChecklistCard.tsx`

Aktuelle Imports (Zeile 1–11):
```typescript
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
```

Aktuelle State-Deklarationen (Zeile 30–38):
```typescript
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [notes, setNotes] = useState('')
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
```

Aktueller Header-Button-Block (Zeilen 82–90):
```tsx
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
```

Aktuelles Modal am Ende des `return` (letzte Zeile vor `}`):
```tsx
      <ImportTemplateModal projectId={projectId} open={showImport} onClose={() => setShowImport(false)} />
```

- [ ] **Step 1: Import für `FileText` und `ImportFromInvoiceModal` hinzufügen**

Ersetze den Lucide-Import:
```typescript
import { Plus, Trash2, Package, CheckCircle2, Circle, Truck, Boxes, FileText } from 'lucide-react'
```

Füge nach dem `ImportTemplateModal`-Import ein:
```typescript
import { ImportFromInvoiceModal } from '@/components/projects/ImportFromInvoiceModal'
```

- [ ] **Step 2: State für `showInvoiceImport` hinzufügen**

Füge nach `const [showImport, setShowImport] = useState(false)` ein:
```typescript
  const [showInvoiceImport, setShowInvoiceImport] = useState(false)
```

- [ ] **Step 3: Zweiten Button im Header einfügen**

Ersetze den Button-Block:
```tsx
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setShowImport(true)}>
              <Boxes className="w-4 h-4 mr-1" />Vorlage laden
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowInvoiceImport(true)}>
              <FileText className="w-4 h-4 mr-1" />Aus Rechnung
            </Button>
            {!showForm && (
              <Button type="button" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" />Material
              </Button>
            )}
          </div>
```

- [ ] **Step 4: `ImportFromInvoiceModal` am Ende des `return` einbinden**

Ersetze die letzte Zeile (nach `<ImportTemplateModal ...>`):
```tsx
      <ImportTemplateModal projectId={projectId} open={showImport} onClose={() => setShowImport(false)} />
      <ImportFromInvoiceModal projectId={projectId} open={showInvoiceImport} onClose={() => setShowInvoiceImport(false)} />
```

- [ ] **Step 5: TypeScript-Build prüfen**

```bash
cd /Users/jhj/scc-crm && npx tsc --noEmit 2>&1; echo "exit:$?"
```

Erwartetes Ergebnis: `exit:0`

- [ ] **Step 6: Manuell im Browser testen**

1. Projekt öffnen, das einen Deal mit mindestens einer Rechnung hat → Button "Aus Rechnung" erscheint im Material-Karten-Header
2. Klick → Modal öffnet sich, Rechnungen werden geladen
3. **1 Rechnung:** Picker entfällt, Positionsvorschau und Modus sofort sichtbar
4. **2+ Rechnungen:** Radio-Liste zeigt alle, nach Auswahl erscheint Positionsvorschau
5. Modus "Anhängen" importieren → bestehende Einträge bleiben, neue kommen hinzu
6. Modus "Ersetzen" importieren → bestehende Einträge weg, nur neue Einträge
7. Projekt ohne Deal → Modal zeigt "Keine Rechnungen gefunden"
8. "Vorlage laden"-Button funktioniert weiterhin unverändert

- [ ] **Step 7: Commit**

```bash
cd /Users/jhj/scc-crm
git add components/projects/MaterialChecklistCard.tsx
git commit -m "feat: add 'Aus Rechnung' import button to MaterialChecklistCard"
```

---

## Self-Review

**Spec-Abdeckung:**
- ✅ Zweiter Button "Aus Rechnung" im MaterialChecklistCard-Header (Task 3)
- ✅ `fetchInvoicesForProject` via Deal-Verknüpfung (Task 1)
- ✅ 1 Rechnung → auto-selected, kein Picker (Task 2, `selected`-Logik)
- ✅ 2+ Rechnungen → Radio-Liste (Task 2)
- ✅ 0 Rechnungen / kein Deal → Empty-State (Task 2)
- ✅ Nur `itemType = 'product'`-Positionen (Task 1)
- ✅ Feld-Mapping: name→title, quantity→quantity, unit→unit, description→notes (Task 1)
- ✅ Import-Modus Anhängen/Ersetzen vom Nutzer wählbar (Task 2)
- ✅ Sicherheits-Check: invoice.dealId === project.dealId (Task 1)
- ✅ `isOrdered: false`, `isArrived: false` beim Einfügen (Task 1)
- ✅ `revalidatePath` nach Import (Task 1)
- ✅ `router.refresh()` + `onClose()` bei Erfolg (Task 2)
- ✅ `ImportTemplateModal` bleibt unverändert (Task 3, nur zusätzliche Zeile)

**Typ-Konsistenz:** `InvoiceOption` wird in Task 1 definiert und in Task 2 exakt so importiert und verwendet. `importMaterialFromInvoice` hat Signatur `(projectId, invoiceId, mode)` in Task 1 und wird in Task 2 so aufgerufen.

**Placeholder-Scan:** Kein TBD, kein TODO, keine "Handle edge cases"-Platzhalter. Alle Edge Cases (kein Deal, keine Rechnung, keine Produktpositionen, Sicherheitscheck) sind mit konkretem Code abgedeckt.
