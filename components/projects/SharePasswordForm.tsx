'use client'
import { useState, useTransition } from 'react'
import { verifySharePassword } from '@/lib/actions/share.actions'
import { Lock } from 'lucide-react'

export function SharePasswordForm({ token }: { token: string }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await verifySharePassword(token, pw)
      if (result.error) { setError(result.error); return }
      window.location.reload()
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-xl border border-slate-200 p-8 w-full max-w-sm space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-slate-400" />
          <h1 className="text-lg font-semibold text-slate-900">Zugang gesichert</h1>
        </div>
        <p className="text-sm text-slate-500">Bitte gib das Passwort ein, das du vom Auftragnehmer erhalten hast.</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            value={pw}
            onChange={(e) => setPw(e.target.value.toUpperCase())}
            placeholder="z.B. AB12CD"
            autoFocus
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit"
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
            Bestätigen
          </button>
        </form>
      </div>
    </div>
  )
}
