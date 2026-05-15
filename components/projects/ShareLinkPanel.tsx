'use client'
import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link2, Link2Off, Copy, CheckCheck } from 'lucide-react'
import { generateShareToken, revokeShareToken } from '@/lib/actions/projects.actions'
import { useRouter } from 'next/navigation'

interface Props {
  projectId: string
  currentToken: string | null
  currentPassword: string | null
}

export function ShareLinkPanel({ projectId, currentToken, currentPassword }: Props) {
  const router = useRouter()
  const [token, setToken] = useState(currentToken)
  const [password, setPassword] = useState(currentPassword)
  const [copied, setCopied] = useState(false)
  const [, startTransition] = useTransition()

  const shareUrl = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/projects/${token}`
    : null

  function handleGenerate() {
    startTransition(async () => {
      const res = await generateShareToken(projectId)
      if (res.token) {
        setToken(res.token)
        if (res.password) setPassword(res.password)
        router.refresh()
      }
    })
  }

  function handleRevoke() {
    if (!confirm('Freigabe-Link wirklich deaktivieren?')) return
    startTransition(async () => {
      await revokeShareToken(projectId)
      setToken(null)
      setPassword(null)
      router.refresh()
    })
  }

  function handleCopy() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="w-4 h-4 text-slate-400" />Freigabe-Link
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {token ? (
          <>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl ?? ''}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-slate-600 truncate"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-500 flex-shrink-0"
                title="Kopieren"
              >
                {copied ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <span className="text-xs text-amber-700 font-medium">Passwort:</span>
                <span className="font-mono text-sm font-bold text-amber-900 tracking-widest">{password}</span>
                <button type="button" onClick={() => navigator.clipboard.writeText(password)}
                  className="ml-auto p-1 hover:bg-amber-100 rounded">
                  <Copy className="w-3.5 h-3.5 text-amber-700" />
                </button>
              </div>
            )}
            {password && (
              <p className="text-xs text-amber-600">Teile Link UND Passwort mit dem Kunden.</p>
            )}
            <p className="text-xs text-slate-500">
              Dieser Link gibt Kunden einen schreibgeschützten Überblick über Status und Meilensteine — ohne Login.
            </p>
            <Button type="button" size="sm" variant="outline" onClick={handleRevoke}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 w-full">
              <Link2Off className="w-3.5 h-3.5 mr-1.5" />Link deaktivieren
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              Erstelle einen sicheren Link, den du mit dem Kunden teilen kannst — kein Login nötig.
            </p>
            <Button type="button" size="sm" onClick={handleGenerate} className="w-full">
              <Link2 className="w-3.5 h-3.5 mr-1.5" />Link erstellen
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
