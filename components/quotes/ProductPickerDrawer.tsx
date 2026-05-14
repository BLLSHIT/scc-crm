'use client'
import { useEffect, useMemo, useState } from 'react'
import { X, Search, Package } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface ProductOption {
  id: string
  name: string
  description?: string | null
  category?: string | null
  unit: string
  defaultPriceNet: number | string
  defaultVatRate: number | string
  imageUrl?: string | null
}

export interface PickedProduct {
  productId: string
  name: string
  description: string
  imageUrl: string
  unit: string
  unitPriceNet: number
  defaultVatRate: number
  quantity: number
}

interface Props {
  open: boolean
  onClose: () => void
  products: ProductOption[]
  onAdd: (picked: PickedProduct[]) => void
}

export function ProductPickerDrawer({ open, onClose, products, onAdd }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  // productId -> quantity (0 means not selected)
  const [selected, setSelected] = useState<Record<string, number>>({})

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setSelected({})
      setSearch('')
      setActiveCategory('all')
    }
  }, [open])

  // Escape closes
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const p of products) {
      if (p.category) set.add(p.category)
    }
    return ['all', ...Array.from(set).sort(), '__none__']
  }, [products])

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (activeCategory === '__none__' && p.category) return false
      if (activeCategory !== 'all' && activeCategory !== '__none__' && p.category !== activeCategory) return false
      if (q && !p.name.toLowerCase().includes(q) && !(p.description ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [products, search, activeCategory])

  const grouped = useMemo(() => {
    const map = new Map<string, ProductOption[]>()
    for (const p of filteredProducts) {
      const key = p.category || 'Ohne Kategorie'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'de'))
  }, [filteredProducts])

  const selectedCount = Object.values(selected).filter((v) => v > 0).length

  function toggle(id: string) {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[id] && next[id] > 0) {
        next[id] = 0
      } else {
        next[id] = 1
      }
      return next
    })
  }

  function setQty(id: string, qty: number) {
    setSelected((prev) => ({ ...prev, [id]: Math.max(0, qty) }))
  }

  function handleAdd() {
    const picked: PickedProduct[] = []
    for (const p of products) {
      const qty = selected[p.id] ?? 0
      if (qty > 0) {
        picked.push({
          productId: p.id,
          name: p.name,
          description: p.description ?? '',
          imageUrl: p.imageUrl ?? '',
          unit: p.unit,
          unitPriceNet: Number(p.defaultPriceNet) || 0,
          defaultVatRate: Number(p.defaultVatRate) || 19,
          quantity: qty,
        })
      }
    }
    if (picked.length > 0) {
      onAdd(picked)
    }
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <aside className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col">
        <header className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-semibold text-slate-900">Produkte hinzufügen</h2>
            <p className="text-xs text-slate-500">
              {selectedCount > 0 ? `${selectedCount} ausgewählt` : 'Mehrfachauswahl möglich'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100"
            aria-label="Schließen"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </header>

        <div className="px-5 py-3 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Produkte durchsuchen…"
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {categories.map((c) => {
              const isActive = activeCategory === c
              const label = c === 'all' ? 'Alle' : c === '__none__' ? 'Ohne Kategorie' : c
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCategory(c)}
                  className={`px-2.5 py-1 text-xs rounded-full border ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {grouped.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-400 text-sm">
              <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              Keine Produkte gefunden.
            </div>
          ) : (
            grouped.map(([cat, items]) => (
              <div key={cat}>
                <div className="px-5 py-2 bg-slate-50/80 border-y text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {cat}
                </div>
                <ul className="divide-y">
                  {items.map((p) => {
                    const qty = selected[p.id] ?? 0
                    const isSelected = qty > 0
                    return (
                      <li
                        key={p.id}
                        className={`px-5 py-3 flex items-center gap-3 ${
                          isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(p.id)}
                          className="w-4 h-4"
                        />
                        <button
                          type="button"
                          className="flex-1 text-left flex items-center gap-3 min-w-0"
                          onClick={() => toggle(p.id)}
                        >
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-10 h-10 object-cover rounded border bg-slate-50"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded border bg-slate-50 flex items-center justify-center">
                              <Package className="w-4 h-4 text-slate-300" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 text-sm truncate">{p.name}</p>
                            <p className="text-xs text-slate-500">
                              {Number(p.defaultPriceNet).toLocaleString('de-DE', {
                                minimumFractionDigits: 2,
                              })}{' '}
                              € / {p.unit} · {Number(p.defaultVatRate)}% MwSt
                            </p>
                          </div>
                        </button>
                        {isSelected && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setQty(p.id, qty - 1)}
                              className="w-7 h-7 border rounded text-sm hover:bg-slate-100"
                              aria-label="Weniger"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={qty}
                              onChange={(e) => setQty(p.id, Number(e.target.value))}
                              className="w-14 px-1 py-1 text-center text-sm border rounded"
                            />
                            <button
                              type="button"
                              onClick={() => setQty(p.id, qty + 1)}
                              className="w-7 h-7 border rounded text-sm hover:bg-slate-100"
                              aria-label="Mehr"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <footer className="px-5 py-3 border-t flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={selectedCount === 0}
          >
            {selectedCount === 0
              ? 'Produkte auswählen'
              : `${selectedCount} hinzufügen`}
          </Button>
        </footer>
      </aside>
    </div>
  )
}
