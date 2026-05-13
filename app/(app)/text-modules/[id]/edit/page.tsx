/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { TextModuleForm } from '@/components/text-modules/TextModuleForm'
import { getTextModuleById } from '@/lib/db/text-modules'
import { updateTextModule, deleteTextModule } from '@/lib/actions/text-modules.actions'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { isFrameworkError, ErrorView } from '@/lib/utils/page-error'
import type { Profile } from '@/types/app.types'

export default async function EditTextModulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let profile: Profile | null = null
  let module: any
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) redirect('/login')
    const profileResult = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    profile = (profileResult.data as Profile) ?? null
    module = await getTextModuleById(id)
  } catch (err) {
    if (isFrameworkError(err)) throw err
    return <ErrorView where="Textbaustein laden" err={err} />
  }

  if (!module) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          Textbaustein nicht gefunden.
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title="Textbaustein bearbeiten"
        profile={profile}
        actions={
          <form
            action={async () => {
              'use server'
              await deleteTextModule(id)
              redirect('/text-modules')
            }}
          >
            <Button size="sm" variant="destructive" type="submit">
              <Trash2 className="w-4 h-4 mr-2" />
              Löschen
            </Button>
          </form>
        }
      />
      <main className="p-6">
        <TextModuleForm
          title="Textbaustein bearbeiten"
          defaultValues={{
            name: module.name ?? '',
            type: module.type,
            content: module.content ?? '',
            isDefault: module.isDefault ?? false,
            sortOrder: module.sortOrder ?? 0,
          }}
          onSubmit={updateTextModule.bind(null, id)}
        />
      </main>
    </div>
  )
}
