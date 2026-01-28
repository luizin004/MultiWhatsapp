import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const uazapiBaseUrl = process.env.UAZAPI_BASE_URL || process.env.NEXT_PUBLIC_UAZAPI_BASE_URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin =
  supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } }) : null

type DeleteRequestBody = {
  instanceToken?: string
}

export async function DELETE(req: NextRequest) {
  try {
    if (!uazapiBaseUrl) {
      return NextResponse.json({ error: 'URL da UAZAPI não configurada.' }, { status: 500 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Credenciais do Supabase ausentes no servidor.' }, { status: 500 })
    }

    const body = (await req.json().catch(() => null)) as DeleteRequestBody | null
    const instanceToken = body?.instanceToken?.trim()

    if (!instanceToken) {
      return NextResponse.json({ error: 'Token da instância é obrigatório.' }, { status: 400 })
    }

    const uazapiResponse = await fetch(`${uazapiBaseUrl}/instance`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        token: instanceToken
      }
    })

    const uazapiData = await uazapiResponse.json().catch(() => null)

    if (!uazapiResponse.ok) {
      const message = uazapiData?.response || uazapiData?.error || 'Falha ao excluir a instância na UAZAPI.'
      return NextResponse.json({ error: message, details: uazapiData }, { status: uazapiResponse.status })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('instances')
      .delete()
      .eq('uazapi_instance_id', instanceToken)

    if (deleteError) {
      throw new Error(deleteError.message || 'Falha ao excluir instância do banco.')
    }

    return NextResponse.json({ success: true, uazapi: uazapiData })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido ao excluir a instância.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
