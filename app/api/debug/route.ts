import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check session
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        step: 'auth',
        ok: false,
        error: authError?.message ?? 'No user session found',
        hint: 'Not authenticated — session cookie missing or expired',
      })
    }

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', user.id)
      .single()

    // Try a test insert into contacts (then immediately delete it)
    const testId = randomUUID()
    const now = new Date().toISOString()

    const { error: insertError } = await supabase
      .from('contacts')
      .insert({
        id: testId,
        firstName: '__debug_test__',
        lastName: '__debug_test__',
        updatedAt: now,
      })

    let insertResult = 'ok'
    if (insertError) {
      insertResult = insertError.message
    } else {
      // Clean up test row
      await supabase.from('contacts').delete().eq('id', testId)
    }

    return NextResponse.json({
      step: 'all',
      ok: !insertError,
      userId: user.id,
      userEmail: user.email,
      profileExists: !!profile,
      profileError: profileError?.message ?? null,
      insertTest: insertResult,
      codeVersion: 'v4-router-push',
    })
  } catch (e: unknown) {
    return NextResponse.json({
      step: 'exception',
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    })
  }
}
