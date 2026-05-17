# Import aus Rechnung — Design Spec

## Ziel

Die Materialliste eines Projekts bekommt einen zweiten Import-Button "Aus Rechnung importieren". Darüber können Produktpositionen einer verknüpften Rechnung direkt als Material-Einträge übernommen werden — ohne manuelle Eingabe.

---

## Kontext & Einschränkungen

- **Nur Courts-Projekte** nutzen die Materialliste — die Funktion erscheint ausschließlich in `MaterialChecklistCard`
- **Invoice-Verknüpfung via Deal**: Rechnungen sind nicht direkt mit Projekten, sondern über `deals` verbunden (`invoice.dealId === project.dealId`)
- **Mehrere Rechnungen pro Deal** sind möglich (Nachrüstungen, Erweiterungen) — der Nutzer wählt dann manuell welche importiert wird
- **Nur `product`-Positionen** werden importiert; `text`-Zeilenpositionen werden übersprungen

---

## Was sich ändert

### Neue Komponente: `ImportFromInvoiceModal`

**Datei:** `components/projects/ImportFromInvoiceModal.tsx`

Client-Komponente mit drei Zuständen:

| Zustand | Bedingung | Anzeige |
|---------|-----------|---------|
| Kein Deal / keine Rechnung | `invoices.length === 0` | Icon + Hinweistext, Import-Button deaktiviert |
| Rechnungsauswahl | `invoices.length >= 2` | Radio-Liste mit `invoiceNumber`, `title`, Anzahl Positionen, Datum |
| Vorschau + Modus | Rechnung gewählt (oder automatisch bei 1) | Positionstabelle (Name/Menge/Einheit, max. 3 Preview + "X weitere…") + Anhängen/Ersetzen-Wahl |

**Props:**
```typescript
interface Props {
  projectId: string
  open: boolean
  onClose: () => void
}
```

**Interne Logik:**
- Ruft `fetchInvoicesForProject(projectId)` via `useEffect` beim Öffnen auf
- Bei 1 Rechnung: automatisch vorausgewählt, Picker-Schritt entfällt
- "Importieren"-Button ruft `importMaterialFromInvoice(projectId, invoiceId, mode)` auf
- Bei Erfolg: `router.refresh()` + `onClose()`

---

### Neue Server-Funktionen in `lib/actions/projects.actions.ts`

#### `fetchInvoicesForProject(projectId)`

```typescript
export async function fetchInvoicesForProject(projectId: string): Promise<InvoiceOption[]>

type InvoiceOption = {
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
```

Ablauf:
1. Auth-Check
2. Projekt laden → `dealId` lesen (null → `[]` zurückgeben)
3. Alle Rechnungen mit `dealId` laden (`invoiceNumber`, `title`, `issueDate`)
4. Für jede Rechnung: `invoice_line_items` mit `itemType = 'product'` laden
5. Kombiniertes Array zurückgeben (neueste zuerst, nach `issueDate DESC`)

#### `importMaterialFromInvoice(projectId, invoiceId, mode)`

```typescript
export async function importMaterialFromInvoice(
  projectId: string,
  invoiceId: string,
  mode: 'append' | 'replace',
): Promise<ActionResult>
```

Ablauf:
1. Auth-Check
2. Projekt laden → `dealId` prüfen (Ownership-Verifikation)
3. Rechnung laden → `invoice.dealId === project.dealId` prüfen (verhindert Import fremder Rechnungen)
4. `invoice_line_items` mit `itemType = 'product'` laden
5. Feld-Mapping:

   | Rechnung | Material |
   |----------|----------|
   | `name` | `title` |
   | `quantity` | `quantity` |
   | `unit` | `unit` |
   | `description` | `notes` |
   | Index | `sortOrder` |

6. Bei `replace`: alle `project_material_items` des Projekts löschen
7. Neue Einträge einfügen (`isOrdered: false`, `isArrived: false`)
8. `revalidatePath('/projects/[id]')`

---

### Geänderte Komponente: `MaterialChecklistCard`

**Datei:** `components/projects/MaterialChecklistCard.tsx`

- Neuer State: `showInvoiceImport: boolean`
- Zweiter Button im Karten-Header neben dem bestehenden "Vorlage importieren"-Button:
  ```tsx
  <Button variant="outline" size="sm" onClick={() => setShowInvoiceImport(true)}>
    <FileText className="w-3 h-3 mr-1" /> Aus Rechnung
  </Button>
  ```
- `<ImportFromInvoiceModal projectId={projectId} open={showInvoiceImport} onClose={() => setShowInvoiceImport(false)} />`

---

## Geänderte Dateien

| Datei | Aktion | Änderung |
|-------|--------|---------|
| `components/projects/ImportFromInvoiceModal.tsx` | **Neu** | Modal mit Rechnungsauswahl, Vorschau und Import-Modus |
| `lib/actions/projects.actions.ts` | Modify | `fetchInvoicesForProject` + `importMaterialFromInvoice` |
| `components/projects/MaterialChecklistCard.tsx` | Modify | Zweiter Import-Button + Modal einbinden |

---

## Was unverändert bleibt

- `ImportTemplateModal` und alle Template-Logik — unverändert
- Rechnung selbst (invoice) — nur gelesen, nie verändert
- Alle anderen Projekt-Karten — unberührt
- Share-Seite, PDF-Routen, Acceptance-Protokoll — unverändert

---

## Edge Cases

| Fall | Verhalten |
|------|-----------|
| Projekt hat keinen Deal | Modal zeigt "Keine Rechnungen gefunden" |
| Deal hat keine Rechnungen | Modal zeigt "Keine Rechnungen gefunden" |
| Rechnung hat keine Produktpositionen | Vorschau leer, Import-Button deaktiviert |
| `replace` mit leerer Zielliste | Löschen-Schritt ist no-op, funktioniert korrekt |
| Invoice nicht am Deal des Projekts | Server Action gibt `{ error: { _form: ['...'] } }` zurück |

---

## Offene Punkte

Keine. Alle Entscheidungen getroffen, keine SQL-Migration nötig (bestehende Tabellen werden genutzt).
