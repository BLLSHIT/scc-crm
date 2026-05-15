'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createWorkflowRule, updateWorkflowRule } from '@/lib/actions/workflow-rules.actions'
import type { WorkflowRule, TriggerType, ActionType } from '@/lib/db/workflow-rules'

interface Props {
  initialData?: WorkflowRule
  pipelineStages: { id: string; name: string; order: number }[]
}

const PROJECT_STATUSES = [
  { value: 'planning', label: 'Planung' },
  { value: 'ordered', label: 'Bestellt' },
  { value: 'installation', label: 'Installation' },
  { value: 'completed', label: 'Abgeschlossen' },
  { value: 'on_hold', label: 'Pausiert' },
  { value: 'cancelled', label: 'Storniert' },
]

export function WorkflowRuleForm({ initialData, pipelineStages }: Props) {
  const router = useRouter()
  const isEdit = !!initialData

  const [isPending, setIsPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const tc = initialData?.triggerConfig ?? {}
  const ac = initialData?.actionConfig ?? {}

  const [name, setName] = useState(initialData?.name ?? '')
  const [triggerType, setTriggerType] = useState<TriggerType>(
    initialData?.triggerType ?? 'deal_stage_changed'
  )
  const [actionType, setActionType] = useState<ActionType>(
    initialData?.actionType ?? 'create_task'
  )
  const [isEnabled, setIsEnabled] = useState(initialData?.isEnabled ?? true)

  // Trigger config state
  const [stageId, setStageId] = useState<string>((tc.stageId as string) ?? '')
  const [daysBeforeExpiry, setDaysBeforeExpiry] = useState<string>(
    String((tc.daysBeforeExpiry as number) ?? 7)
  )
  const [inactiveDays, setInactiveDays] = useState<string>(
    String((tc.days as number) ?? 14)
  )
  const [projectStatus, setProjectStatus] = useState<string>(
    (tc.status as string) ?? 'planning'
  )

  // Action config state — create_task
  const [taskTitle, setTaskTitle] = useState<string>((ac.title as string) ?? '')
  const [taskDueDays, setTaskDueDays] = useState<string>(
    String((ac.dueDays as number) ?? '')
  )
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>((ac.assigneeId as string) ?? '')
  const [taskDescription, setTaskDescription] = useState<string>((ac.description as string) ?? '')

  // Action config state — create_project
  const [projectNameTemplate, setProjectNameTemplate] = useState<string>(
    (ac.nameTemplate as string) ?? ''
  )
  const [projectActionStatus, setProjectActionStatus] = useState<string>(
    (ac.status as string) ?? 'planning'
  )
  const [copyCompanyId, setCopyCompanyId] = useState<boolean>(
    (ac.copyCompanyId as boolean) ?? false
  )

  function buildTriggerConfig(): Record<string, unknown> {
    switch (triggerType) {
      case 'deal_stage_changed':
        return { stageId }
      case 'quote_expiring':
        return { daysBeforeExpiry: Number(daysBeforeExpiry) || 7 }
      case 'deal_inactive':
        return { days: Number(inactiveDays) || 14 }
      case 'project_status_changed':
        return { status: projectStatus }
    }
  }

  function buildActionConfig(): Record<string, unknown> {
    if (actionType === 'create_task') {
      const cfg: Record<string, unknown> = { title: taskTitle }
      if (taskDueDays) cfg.dueDays = Number(taskDueDays)
      if (taskAssigneeId) cfg.assigneeId = taskAssigneeId
      if (taskDescription) cfg.description = taskDescription
      return cfg
    }
    // create_project
    return {
      nameTemplate: projectNameTemplate,
      status: projectActionStatus,
      copyCompanyId,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    setIsPending(true)

    const input = {
      name,
      isEnabled,
      triggerType,
      triggerConfig: buildTriggerConfig(),
      actionType,
      actionConfig: buildActionConfig(),
    }

    try {
      const result = isEdit
        ? await updateWorkflowRule(initialData!.id, input)
        : await createWorkflowRule(input)

      if (result.error) {
        const msg =
          result.error._form?.[0] ??
          Object.values(result.error).flat()[0] ??
          'Unbekannter Fehler beim Speichern.'
        setServerError(msg)
      } else if (result.redirectTo) {
        router.push(result.redirectTo)
      }
    } catch (err) {
      console.error('WorkflowRuleForm submit error:', err)
      setServerError('Ein unerwarteter Fehler ist aufgetreten.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Regel bearbeiten' : 'Neue Workflow-Regel'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {serverError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <strong>Fehler:</strong> {serverError}
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Aufgabe bei Phase-Wechsel"
              required
            />
          </div>

          {/* Trigger Type */}
          <div className="space-y-1.5">
            <Label htmlFor="triggerType">Trigger-Typ</Label>
            <select
              id="triggerType"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as TriggerType)}
              className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
            >
              <option value="deal_stage_changed">Deal: Phase geändert</option>
              <option value="quote_expiring">Angebot: läuft ab</option>
              <option value="deal_inactive">Deal: inaktiv</option>
              <option value="project_status_changed">Projekt: Status geändert</option>
            </select>
          </div>

          {/* Trigger Config */}
          <div className="space-y-1.5 pl-4 border-l-2 border-slate-100">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Trigger-Konfiguration</p>
            {triggerType === 'deal_stage_changed' && (
              <div className="space-y-1.5">
                <Label htmlFor="stageId">Phase</Label>
                <select
                  id="stageId"
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                  className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
                >
                  <option value="">— beliebige Phase —</option>
                  {pipelineStages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            {triggerType === 'quote_expiring' && (
              <div className="space-y-1.5">
                <Label htmlFor="daysBeforeExpiry">X Tage vor Ablauf</Label>
                <Input
                  id="daysBeforeExpiry"
                  type="number"
                  min={1}
                  value={daysBeforeExpiry}
                  onChange={(e) => setDaysBeforeExpiry(e.target.value)}
                  className="w-32"
                />
              </div>
            )}
            {triggerType === 'deal_inactive' && (
              <div className="space-y-1.5">
                <Label htmlFor="inactiveDays">Seit X Tagen keine Aktivität</Label>
                <Input
                  id="inactiveDays"
                  type="number"
                  min={1}
                  value={inactiveDays}
                  onChange={(e) => setInactiveDays(e.target.value)}
                  className="w-32"
                />
              </div>
            )}
            {triggerType === 'project_status_changed' && (
              <div className="space-y-1.5">
                <Label htmlFor="projectStatus">Projekt-Status</Label>
                <select
                  id="projectStatus"
                  value={projectStatus}
                  onChange={(e) => setProjectStatus(e.target.value)}
                  className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Action Type */}
          <div className="space-y-1.5">
            <Label htmlFor="actionType">Aktion</Label>
            <select
              id="actionType"
              value={actionType}
              onChange={(e) => setActionType(e.target.value as ActionType)}
              className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
            >
              <option value="create_task">Aufgabe erstellen</option>
              <option value="create_project">Projekt erstellen</option>
            </select>
          </div>

          {/* Action Config */}
          <div className="space-y-3 pl-4 border-l-2 border-slate-100">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Aktions-Konfiguration</p>
            {actionType === 'create_task' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="taskTitle">Titel *</Label>
                  <Input
                    id="taskTitle"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="z.B. {{dealTitle}} nachfassen"
                    required
                  />
                  <p className="text-xs text-slate-400">
                    Variablen: {`{{dealTitle}}`}, {`{{projectName}}`}, {`{{companyName}}`}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="taskDueDays">Fällig in X Tagen</Label>
                  <Input
                    id="taskDueDays"
                    type="number"
                    min={1}
                    value={taskDueDays}
                    onChange={(e) => setTaskDueDays(e.target.value)}
                    placeholder="z.B. 3"
                    className="w-32"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="taskAssigneeId">Zuständiger (optional)</Label>
                  <Input
                    id="taskAssigneeId"
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    placeholder="User-ID"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="taskDescription">Beschreibung (optional)</Label>
                  <Textarea
                    id="taskDescription"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}
            {actionType === 'create_project' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="projectNameTemplate">Name-Template *</Label>
                  <Input
                    id="projectNameTemplate"
                    value={projectNameTemplate}
                    onChange={(e) => setProjectNameTemplate(e.target.value)}
                    placeholder="z.B. Projekt: {{dealTitle}}"
                    required
                  />
                  <p className="text-xs text-slate-400">
                    Variablen: {`{{dealTitle}}`}, {`{{projectName}}`}, {`{{companyName}}`}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="projectActionStatus">Status</Label>
                  <select
                    id="projectActionStatus"
                    value={projectActionStatus}
                    onChange={(e) => setProjectActionStatus(e.target.value)}
                    className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
                  >
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="copyCompanyId"
                    type="checkbox"
                    checked={copyCompanyId}
                    onChange={(e) => setCopyCompanyId(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <Label htmlFor="copyCompanyId" className="cursor-pointer">
                    Firma vom Deal übernehmen
                  </Label>
                </div>
              </>
            )}
          </div>

          {/* isEnabled */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="isEnabled"
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="rounded border-slate-300"
            />
            <Label htmlFor="isEnabled" className="cursor-pointer">Regel aktiv</Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Speichern…' : 'Speichern'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
