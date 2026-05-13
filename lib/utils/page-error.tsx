/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Detects Next.js framework errors (redirect, notFound) that must propagate
 * — never swallow these in user-facing try/catch blocks.
 */
export function isFrameworkError(err: any): boolean {
  const d = err?.digest
  return typeof d === 'string' && (d.startsWith('NEXT_REDIRECT') || d === 'NEXT_NOT_FOUND')
}

/**
 * Renders a visible error box bypassing Next.js's production redaction.
 * Use inside catch blocks in server components when you want the actual
 * error surfaced to the user instead of "An error occurred…".
 */
export function ErrorView({ where, err }: { where: string; err: any }) {
  return (
    <div className="flex-1 p-6">
      <div className="max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 space-y-3">
        <h2 className="font-semibold text-red-800">Fehler in {where}</h2>
        <pre className="text-xs text-red-700 whitespace-pre-wrap break-all bg-white border border-red-100 rounded p-3">
{`name:    ${err?.name ?? '(none)'}
message: ${err?.message ?? String(err)}
code:    ${err?.code ?? '(none)'}
hint:    ${err?.hint ?? '(none)'}
details: ${err?.details ?? '(none)'}
digest:  ${err?.digest ?? '(none)'}

stack:
${err?.stack ?? '(none)'}`}
        </pre>
      </div>
    </div>
  )
}
